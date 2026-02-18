import { Tmux } from './Tmux'
import { AgentType } from './types'

export class SessionManager {
  private sessions: Map<number, Tmux> = new Map()
  private nextId: number = 0

  async createSession(path: string, agentType: AgentType): Promise<number> {
    const id = this.nextId++
    const name = `${id}_${path.replace(/\//g, '-')}`
    const tmux = new Tmux(id, path, agentType)
    await tmux.init()
    this.sessions.set(id, tmux)
    return id
  }

  getSession(id: number): Tmux | undefined {
    return this.sessions.get(id)
  }

  async removeSession(id: number): Promise<boolean> {
    const tmux = this.sessions.get(id)
    if (tmux) {
      await tmux.release()
      this.sessions.delete(id)
      return true
    }
    return false
  }

  hasSession(id: number): boolean {
    return this.sessions.has(id)
  }

  getSessionNames(): string[] {
    return Array.from(this.sessions.values()).map(tmux => tmux.name)
  }
}

// Singleton instance
export const sessionManager = new SessionManager()
