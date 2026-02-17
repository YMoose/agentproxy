# AgentProxy

http request -> tmux -> agent -> tmux -> http response

## UML

``` mermaid
classDiagram
    class Tmux {
        -String name    // session name (default: N_path)
        -String path    // session work directory
        -Long id        // auto-gen unique id
        -Agent agent
        -Date create_time
        +Void init(path, agent_type)
        +Void release()
        +String inputToAgent()
        +String interactiveWithAgent()
        +Agent getAgent()
        +String toString()
    }
    class Agent {
        -Int type       // agent type(claude/codex...)
        -Int state
    }
    Tmux --> Agent
```

## agent state

1. wait_input
2. execute
3. interactive
    - choice and input
    - ctrl + c: interrupt
    - shift + tab: toggle permission modes
    - doubel esc: rewind or summarize 
    - (todo) ctrl + o: verbose output 
    - (todo) ctrl+T: toggle task list

``` mermaid
stateDiagram-v2
    [*] --> wait_input
    wait_input -->execute
    execute --> wait_input
    wait_input --> interactive
    interactive --> wait_input
```

every incoming edge of state wait_input have to notificate
every outcoming edge of state wait_input need user's input

## tmux function

### inputToAgent

```bash
tmux send-keys -t 0_home-agentproxy:0 "hello"   # Send text
tmux send-keys -t 0_home-agentproxy:0 Enter     # Submit
```

### interactiveWithAgent

#### choice

```bash
# Option 1 (yes) or 2 (yes and add premission)
tmux send-keys -t 0_home-agentproxy:0 "1"

# Option 3 (no with feedback)
tmux send-keys -t 0_home-agentproxy:0 Down Down   # Navigate to option 3
tmux send-keys -t 0_home-agentproxy:0 Tab         # Enable input box
tmux send-keys -t 0_home-agentproxy:0 "hello"     # Send feedback text
tmux send-keys -t 0_home-agentproxy:0 Enter       # Submit
```

## http api

### start a tmux session

```
POST /new
Content-Type: application/json

{
  "type": "claude",
  "path": "user path"
}
```

and response the name of the tmux

### kill a tmux session 
```
POST /release
Content-Type: application/json

{
  "name": "tmux name"
}
```

### outcoming edge of state wait_input

**Available Types:**
| Type | Description |
|------|-------------|
| `input` | Normal text input to agent |
| `choice` | Select from options |
| `interrupt` | Stop current execution (ctrl+c) |
| `toggle_permission` | Cycle permission modes (shift+tab) |
| `rewind` | Rewind/summarize conversation (double esc) |

**HTTP Request:**
```
POST /input
Content-Type: application/json

{
  "name": "tmux name",
  "type": "input",
  "text": "your message here"
}
```

```
POST /input
Content-Type: application/json

{
  "name": "tmux name",
  "type": "choice",
  "choice": "3",
  "text": "your message here"
}
```

### incoming edge of state wait_input

#### claude 

use [hook](https://code.claude.com/docs/en/hooks) to triggle output capture

- `PermissionRequest`
```
POST /dialog_appears
Content-Type: application/json

{
  "name": "tmux name",
}
```
- `Stop`
```
POST /stop
Content-Type: application/json

{
  "name": "tmux name",
}
```