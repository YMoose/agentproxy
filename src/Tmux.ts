import { exec } from 'child_process'
import { promisify } from 'util'
import { Agent } from './Agent'
import { AgentType, AgentState } from './types'

const execAsync = promisify(exec)

export class Tmux {
  name: string
  path: string
  id: number
  agent: Agent
  createTime: Date
  private stateResolver: (() => void) | null = null

  constructor(id: number, path: string, agentType: AgentType) {
    this.id = id
    this.path = path
    this.name = `${id}_${path.replace(/\//g, '-')}`
    this.agent = new Agent(agentType)
    this.createTime = new Date()
  }

  // Execute tmux command directly
  private async tmux(cmd: string): Promise<string> {
    const { stdout } = await execAsync(`tmux ${cmd}`)
    return stdout
  }

  // Initialize tmux session
  async init(): Promise<void> {
    const exists = await this.tmux(`has-session -t ${this.name} 2>/dev/null && echo yes || echo no`)
    if (exists.trim() !== 'yes') {
      await this.tmux(`new-session -d -s ${this.name} -c ${this.path}`)
      await this.tmux(`send-keys -t ${this.target} "${this.agent.type}"`)
      await this.tmux(`send-keys -t ${this.target} Enter`)
    }
  }

  // Release/kill tmux session
  async release(): Promise<void> {
    await this.tmux(`kill-session -t ${this.name} 2>/dev/null || true`)
  }

  // Get target string
  private get target(): string {
    return `${this.name}:0`
  }

  // Wait for state to become WAIT_INPUT
  private async waitForWaitInput(): Promise<void> {
    if (this.agent.state === AgentState.WAIT_INPUT) {
      return
    }
    return new Promise((resolve) => {
      this.stateResolver = resolve
    })
  }

  // Called by /stop hook to signal execution complete
  notifyWaiting(): void {
    this.agent.state = AgentState.WAIT_INPUT
    if (this.stateResolver) {
      this.stateResolver()
      this.stateResolver = null
    }
  }

  // Send input to agent
  async inputToAgent(text: string): Promise<string> {
    await this.tmux(`send-keys -t ${this.target} "${text}"`)
    await new Promise(resolve => setTimeout(resolve, 1000))
    await this.tmux(`send-keys -t ${this.target} Enter`)

    // Set state to EXECUTE and wait for WAIT_INPUT
    this.agent.state = AgentState.EXECUTE
    await this.waitForWaitInput()

    return await this.captureOutput()
  }

  // Interactive with agent (choices)
  async interactiveWithAgent(choice: number, feedback?: string): Promise<string> {
    if (feedback) {
      await this.tmux(`send-keys -t ${this.target} Down Down`)
      await this.tmux(`send-keys -t ${this.target} Tab`)
      await this.tmux(`send-keys -t ${this.target} "${feedback}"`)
      await this.tmux(`send-keys -t ${this.target} Enter`)
    } else {
      await this.tmux(`send-keys -t ${this.target} "${choice}"`)
    }

    // Set state to EXECUTE and wait for WAIT_INPUT
    this.agent.state = AgentState.INTERACTIVE
    await this.waitForWaitInput()

    return await this.captureOutput(2)
  }

  // Capture output: go backward until we meet >, collect lines along the way(now only for normal output)
  async captureOutput(output_type: number = 0): Promise<string> {
    const output = await this.tmux(`capture-pane -t ${this.target} -p -J`)
    const lines = output.split('\n')
    const result: string[] = []

    const isSeparator = (line: string): boolean => {
      const trimmed = line.trim()
      if (trimmed.length === 0) return false
      // Check if line is mostly separator characters
      const sepChars = trimmed.replace(/[─═━─-]/g, '')
      return sepChars.length < trimmed.length * 0.3
    }

    const isPrompt = (line: string): boolean => {
      return line.includes('❯') || line.includes('>')
    }

    let isInputBox = 1
    let hasMetPrompt = 0

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]
      console.log("test ", i, ": ", line)
      if (isPrompt(line)) {
        if (isInputBox === 0) {
          break
        }
        hasMetPrompt = 1
      }

      if (isSeparator(line)) {
        if (hasMetPrompt === 1) {
          isInputBox = 0
          continue
        }
      }

      if (isInputBox === 0 || output_type === 2) {
        result.unshift(line)
      }
    }

    return result.join('\n').trim()
  }

  getAgent(): Agent {
    return this.agent
  }

  toString(): string {
    return `Tmux(${this.name}, path=${this.path}, state=${this.agent.state})`
  }
}
