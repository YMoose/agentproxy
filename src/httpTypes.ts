// HTTP Request/Response Types for AgentProxy API

import { AgentType } from './types'

export type InputType = 'input' | 'choice' | 'interrupt' | 'toggle_permission' | 'rewind'

export interface NewSessionRequest {
  type: AgentType
  path: string
}

export interface NewSessionResponse {
  success: boolean
  name?: string
  error?: string
}

export interface ReleaseSessionRequest {
  name: string
}

export interface ReleaseSessionResponse {
  success: boolean
  error?: string
}

export interface InputRequest {
  type: InputType
  text?: string      // for 'input' and 'choice' types
  choice?: string    // for 'choice' type (1, 2, 3, etc.)
  name?: string      // session name (optional, uses default if not provided)
}

export interface InputResponse {
  success: boolean
  output?: string
  error?: string
}

export interface DialogRequest {
  name: string       // tmux session name
}

export interface DialogResponse {
  success: boolean
  error?: string
}

export interface StopRequest {
  name: string       // tmux session name
}

export interface StopResponse {
  success: boolean
  error?: string
}
