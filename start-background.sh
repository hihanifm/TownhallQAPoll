#!/bin/bash

# Script to start both backend and frontend servers in the background
# LINUX/macOS ONLY - For Windows, use the batch scripts or PowerShell scripts

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/server.pids"
LOG_DIR="$SCRIPT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Function to get local IP address
get_local_ip() {
    # Try different methods to get local IP
    local ip=""
    
    # Method 1: Try ip command (Linux)
    if command -v ip >/dev/null 2>&1; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1)
    fi
    
    # Method 2: Try ifconfig (macOS/Linux)
    if [ -z "$ip" ] && command -v ifconfig >/dev/null 2>&1; then
        # Get IP from default interface (usually en0 on macOS, eth0 on Linux)
        ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    fi
    
    # Method 3: Try hostname (fallback)
    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    
    echo "$ip"
}

# Check if servers are already running
if [ -f "$PID_FILE" ]; then
    echo "Checking for existing servers..."
    while IFS= read -r pid; do
        if ps -p $pid > /dev/null 2>&1; then
            echo "Warning: Server with PID $pid is already running!"
            echo "Use ./stop-background.sh to stop them first."
            read -p "Continue anyway? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
            break
        fi
    done < "$PID_FILE"
fi

# Check if ports are in use
if check_port 3001; then
    echo "Warning: Port 3001 (backend) is already in use!"
fi

if check_port 3000; then
    echo "Warning: Port 3000 (frontend) is already in use!"
fi

echo "Starting Townhall Q&A Poll servers in background..."
echo ""

# Start backend server
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"
nohup npm start > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
# Disown the process to fully detach it from the shell
disown $BACKEND_PID 2>/dev/null || true
echo "Backend started with PID: $BACKEND_PID"

# Wait a moment for backend to initialize
sleep 2

# Start frontend server
echo "Starting frontend server..."
cd "$SCRIPT_DIR/frontend"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
# Disown the process to fully detach it from the shell
disown $FRONTEND_PID 2>/dev/null || true
echo "Frontend started with PID: $FRONTEND_PID"

# Save PIDs to file
echo "$BACKEND_PID" > "$PID_FILE"
echo "$FRONTEND_PID" >> "$PID_FILE"

# Get local IP address
LOCAL_IP=$(get_local_ip)

echo ""
echo "✓ Servers started in background!"
echo ""
echo "Access URLs:"
echo "  Backend:"
echo "    - Local:  http://localhost:3001"
if [ -n "$LOCAL_IP" ]; then
    echo "    - Network: http://$LOCAL_IP:3001"
fi
echo "  Frontend:"
echo "    - Local:  http://localhost:3000"
if [ -n "$LOCAL_IP" ]; then
    echo "    - Network: http://$LOCAL_IP:3000"
fi
echo ""
echo "Logs are available in: $LOG_DIR/"
echo "  - Backend:  $LOG_DIR/backend.log"
echo "  - Frontend: $LOG_DIR/frontend.log"
echo ""
echo "To stop the servers, run: ./stop-background.sh"
echo "To check status, run: ./status-background.sh"
echo ""
echo "Note: Processes are running in the background and will continue"
echo "      even if you close this terminal window."
echo ""
