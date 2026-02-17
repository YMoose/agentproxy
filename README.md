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

### return capture output

every time the agent state trans to wait_input should triggle the capture of the output of the input or interactive. the triggle method is using the hook mechanism. 

the output content is between prompts using prompt markers.

```bash
# 1. Save last prompt line number BEFORE sending input
LAST_PROMPT=$(tmux capture-pane -t 0_home-agentproxy:0 -p -J | grep -n '❯' | tail -1 | cut -d: -f1)

# 2. Send input
tmux send-keys -t 0_home-agentproxy:0 "your input"
tmux send-keys -t 0_home-agentproxy:0 Enter

# 3. Wait for response, then get new prompt line number
NEW_PROMPT=$(tmux capture-pane -t 0_home-agentproxy:0 -p -J | grep -n '❯' | tail -1 | cut -d: -f1)

# 4. Capture output between prompts
tmux capture-pane -t 0_home-agentproxy:0 -p -J | sed -n "${LAST_PROMPT},${NEW_PROMPT}p"
```

**Note**: `-J` flag unwraps lines, handling wrapped text properly.

## http api

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
  "type": "input",
  "text": "your message here"
}
```