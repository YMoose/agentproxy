import { Tmux } from './Tmux'
import { AgentType } from './types'

async function main() {
  const tmux = new Tmux(0, process.cwd(), AgentType.CLAUDE)

  console.log('Initializing tmux session...')
  await tmux.init()

  console.log('Session created:', tmux.toString())

  // Demo: send input
  const output = await tmux.inputToAgent('write "ttt" into test.md')
  console.log('Output:', output)

  // Cleanup
  await tmux.release()
}

main().catch(console.error)
