import { AgentState, AgentType } from './types'

export class Agent {
  type: AgentType
  state: AgentState = AgentState.WAIT_INPUT

  constructor(type: AgentType) {
    this.type = type
  }
}
