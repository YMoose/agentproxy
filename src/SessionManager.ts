import { Tmux } from './Tmux'
import { AgentType } from './types'

export class SessionManager {
  private sessions: Map<string, Tmux> = new Map()
  private nextId: number = 0

  async createSession(path: string, agentType: AgentType): Promise<string> {
    const id = this.nextId++
    const name = `${id}_${path.replace(/\//g, '-')}`
    const tmux = new Tmux(id, path, agentType)
    await tmux.init()
    this.sessions.set(name, tmux)
    return name
  }

  getSession(name: string): Tmux | undefined {
    return this.sessions.get(name)
  }

  async removeSession(name: string): Promise<boolean> {
    const tmux = this.sessions.get(name)
    if (tmux) {
      await tmux.release()
      this.sessions.delete(name)
      return true
    }
    return false
  }

  hasSession(name: string): boolean {
    return this.sessions.has(name)
  }

  getSessionNames(): string[] {
    return Array.from(this.sessions.keys())
  }
}

// Singleton instance
export const sessionManager = new SessionManager()
