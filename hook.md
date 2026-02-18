# stop
sleep 1 && curl -X POST http://localhost:3000/stop \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$(tmux display-message -p '#S')\"}"

# PermissionRequest
sleep 1 &&  curl -X POST http://localhost:3000/dialog_appears \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$(tmux display-message -p '#S')\"}" 