import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { InputRequest, InputResponse, DialogRequest, DialogResponse, StopRequest, StopResponse, NewSessionRequest, NewSessionResponse, ReleaseSessionRequest, ReleaseSessionResponse } from './httpTypes'
import { sessionManager } from './SessionManager'
import { AgentType } from './types'

const app = new Hono()

// Enable CORS
app.use('/*', cors())

// POST /new - create a new tmux session
app.post('/new', async (c) => {
  try {
    const body = await c.req.json<NewSessionRequest>()
    const { type, path } = body

    if (!type || !path) {
      return c.json<NewSessionResponse>({
        success: false,
        error: 'Missing required fields: type and path'
      }, 400)
    }

    if (!Object.values(AgentType).includes(type)) {
      return c.json<NewSessionResponse>({
        success: false,
        error: `Invalid agent type: ${type}. Valid types: ${Object.values(AgentType).join(', ')}`
      }, 400)
    }

    // todo: valid path

    const id = await sessionManager.createSession(path, type)
    console.log(`[Session] Created session with id: ${id}`)

    return c.json<NewSessionResponse>({ success: true, id })
  } catch (error) {
    return c.json<NewSessionResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /release - kill a tmux session
app.post('/release', async (c) => {
  try {
    const body = await c.req.json<ReleaseSessionRequest>()
    const { id } = body

    if (id === undefined) {
      return c.json<ReleaseSessionResponse>({
        success: false,
        error: 'Missing required field: id'
      }, 400)
    }

    const removed = await sessionManager.removeSession(id)
    if (!removed) {
      return c.json<ReleaseSessionResponse>({
        success: false,
        error: `Session '${id}' not found`
      }, 404)
    }

    console.log(`[Session] Released session: ${id}`)
    return c.json<ReleaseSessionResponse>({ success: true })
  } catch (error) {
    return c.json<ReleaseSessionResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /input - send commands to agent
app.post('/input', async (c) => {
  try {
    const body = await c.req.json<InputRequest>()
    const { type, text, choice, id } = body

    if (id === undefined) {
      return c.json<InputResponse>({
        success: false,
        error: 'Missing required field: id'
      }, 400)
    }

    const tmux = sessionManager.getSession(id)
    if (!tmux) {
      return c.json<InputResponse>({
        success: false,
        error: `Session '${id}' not found`
      }, 404)
    }

    let output: string

    switch (type) {
      case 'input':
        if (!text) {
          return c.json<InputResponse>({ success: false, error: 'Missing text for input type' }, 400)
        }
        output = await tmux.inputToAgent(text)
        break

      case 'choice':
        if (!choice) {
          return c.json<InputResponse>({ success: false, error: 'Missing choice for choice type' }, 400)
        }
        output = await tmux.interactiveWithAgent(parseInt(choice), text)
        break

      case 'interrupt':
        // TODO: Implement interruptAgent() in Tmux.ts
        // output = await tmux.interruptAgent()
        return c.json<InputResponse>({ success: false, error: 'interrupt not implemented yet' }, 501)

      case 'toggle_permission':
        // TODO: Implement togglePermission() in Tmux.ts
        // output = await tmux.togglePermission()
        return c.json<InputResponse>({ success: false, error: 'toggle_permission not implemented yet' }, 501)

      case 'rewind':
        // TODO: Implement rewind() in Tmux.ts
        // output = await tmux.rewind()
        return c.json<InputResponse>({ success: false, error: 'rewind not implemented yet' }, 501)

      default:
        return c.json<InputResponse>({ success: false, error: `Unknown type: ${type}` }, 400)
    }

    return c.json<InputResponse>({ success: true, output })
  } catch (error) {
    return c.json<InputResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /dialog_appears - hook for PermissionRequest
app.post('/dialog_appears', async (c) => {
  try {
    const body = await c.req.json<DialogRequest>()
    const { name } = body

    // Extract id from name (format: N_xxx)
    const id = parseInt(name.split('_')[0])
    if (isNaN(id)) {
      return c.json<DialogResponse>({
        success: false,
        error: `Invalid session name format: ${name}`
      }, 400)
    }

    const tmux = sessionManager.getSession(id)
    if (!tmux) {
      return c.json<DialogResponse>({
        success: false,
        error: `Session '${name}' not found`
      }, 404)
    }

    // Notify that interactive is complete (sets state to WAIT_INPUT and resolves the promise)
    tmux.notifyWaiting(2)

    console.log(`[Hook] Dialog appeared in session: ${name}`)
    return c.json<DialogResponse>({ success: true })
  } catch (error) {
    return c.json<DialogResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// POST /stop - hook for Stop
app.post('/stop', async (c) => {
  try {
    const body = await c.req.json<StopRequest>()
    const { name } = body

    // Extract id from name (format: N_xxx)
    const id = parseInt(name.split('_')[0])
    if (isNaN(id)) {
      return c.json<StopResponse>({
        success: false,
        error: `Invalid session name format: ${name}`
      }, 400)
    }

    const tmux = sessionManager.getSession(id)
    if (!tmux) {
      return c.json<StopResponse>({
        success: false,
        error: `Session '${name}' not found`
      }, 404)
    }

    // Notify that execution is complete (sets state to WAIT_INPUT and resolves the promise)
    tmux.notifyWaiting(1)

    console.log(`[Hook] Agent stopped in session: ${name}`)
    return c.json<StopResponse>({ success: true })
  } catch (error) {
    return c.json<StopResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /sessions - list all sessions
app.get('/sessions', (c) => {
  return c.json({
    sessions: sessionManager.getSessionNames()
  })
})

// GET /health - health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

export { app }
