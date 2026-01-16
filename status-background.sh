#!/bin/bash

# Script to check the status of background servers
# LINUX/macOS ONLY - For Windows, check Task Manager or use netstat

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/server.pids"
LOG_DIR="$SCRIPT_DIR/logs"

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

# Function to get version
get_version() {
    if [ -f "$SCRIPT_DIR/VERSION" ]; then
        cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]'
    elif [ -f "$SCRIPT_DIR/package.json" ]; then
        grep -o '"version": "[^"]*"' "$SCRIPT_DIR/package.json" | cut -d'"' -f4
    else
        echo "unknown"
    fi
}

VERSION=$(get_version)

echo "Townhall Q&A Poll Server Status"
echo "Version: $VERSION"
echo "================================"
echo ""

# Detect overall mode by checking frontend process on port 3000
MODE="UNKNOWN"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    # Get the first PID listening on port 3000
    FRONTEND_PORT_PID=$(lsof -ti:3000 | head -1)
    if [ -n "$FRONTEND_PORT_PID" ]; then
        FRONTEND_CMD=$(ps -p $FRONTEND_PORT_PID -o command= 2>/dev/null | tr -d '\n')
        if echo "$FRONTEND_CMD" | grep -q "vite preview"; then
            MODE="PRODUCTION"
        elif echo "$FRONTEND_CMD" | grep -q "vite"; then
            MODE="DEVELOPMENT"
        fi
    fi
fi

if [ "$MODE" != "UNKNOWN" ]; then
    echo "Mode: $MODE"
    echo ""
fi

# Check PID file
if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Servers may not be running via start-background.sh"
    echo ""
else
    echo "From PID file:"
    PIDS=()
    while IFS= read -r pid; do
        if [ -n "$pid" ]; then
            PIDS+=($pid)
        fi
    done < "$PID_FILE"
    
    if [ ${#PIDS[@]} -ge 1 ]; then
        BACKEND_PID=${PIDS[0]}
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "  Backend (PID $BACKEND_PID):  ✓ Running"
        else
            echo "  Backend (PID $BACKEND_PID):  ✗ Not running"
        fi
    fi
    
    if [ ${#PIDS[@]} -ge 2 ]; then
        FRONTEND_PID=${PIDS[1]}
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            # Check if running in production mode by examining the process command
            FRONTEND_CMD=$(ps -p $FRONTEND_PID -o command= 2>/dev/null | tr -d '\n')
            if echo "$FRONTEND_CMD" | grep -q "vite preview"; then
                FRONTEND_MODE="PRODUCTION"
            elif echo "$FRONTEND_CMD" | grep -q "vite"; then
                FRONTEND_MODE="DEVELOPMENT"
            else
                FRONTEND_MODE=""
            fi
            if [ -n "$FRONTEND_MODE" ]; then
                echo "  Frontend (PID $FRONTEND_PID): ✓ Running ($FRONTEND_MODE)"
            else
                echo "  Frontend (PID $FRONTEND_PID): ✓ Running"
            fi
        else
            echo "  Frontend (PID $FRONTEND_PID): ✗ Not running"
        fi
    fi
    echo ""
fi

# Check by port
echo "Port status:"
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:3001)
    echo "  Port 3001 (backend):  ✓ In use (PID: $PORT_PID)"
else
    echo "  Port 3001 (backend):  ✗ Not in use"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:3000)
    echo "  Port 3000 (frontend): ✓ In use (PID: $PORT_PID)"
else
    echo "  Port 3000 (frontend): ✗ Not in use"
fi

echo ""

# Show access URLs
LOCAL_IP=$(get_local_ip)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Access URLs:"
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  Backend:"
        echo "    - Local:  http://localhost:3001"
        if [ -n "$LOCAL_IP" ]; then
            echo "    - Network: http://$LOCAL_IP:3001"
        fi
    fi
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  Frontend:"
        echo "    - Local:  http://localhost:3000"
        if [ -n "$LOCAL_IP" ]; then
            echo "    - Network: http://$LOCAL_IP:3000"
        fi
    fi
    echo ""
fi

# Show log file info
if [ -d "$LOG_DIR" ]; then
    echo "Log files:"
    if [ -f "$LOG_DIR/backend.log" ]; then
        BACKEND_SIZE=$(du -h "$LOG_DIR/backend.log" | cut -f1)
        echo "  Backend log:  $LOG_DIR/backend.log ($BACKEND_SIZE)"
    fi
    if [ -f "$LOG_DIR/frontend.log" ]; then
        FRONTEND_SIZE=$(du -h "$LOG_DIR/frontend.log" | cut -f1)
        echo "  Frontend log: $LOG_DIR/frontend.log ($FRONTEND_SIZE)"
    fi
    if [ -f "$LOG_DIR/frontend-build.log" ]; then
        BUILD_SIZE=$(du -h "$LOG_DIR/frontend-build.log" | cut -f1)
        echo "  Build log:    $LOG_DIR/frontend-build.log ($BUILD_SIZE)"
    fi
    echo ""
    echo "To view logs:"
    echo "  tail -f $LOG_DIR/backend.log"
    echo "  tail -f $LOG_DIR/frontend.log"
    if [ -f "$LOG_DIR/frontend-build.log" ]; then
        echo "  tail -f $LOG_DIR/frontend-build.log  # (production build log)"
    fi
fi

echo ""
