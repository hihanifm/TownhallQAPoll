#!/bin/bash

# Script to check the status of background servers
# LINUX/macOS ONLY

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

echo "Townhall Q&A Poll Server Status"
echo "================================"
echo ""

# Detect overall mode and configuration
FRONTEND_MODE="UNKNOWN"
BACKEND_MODE="UNKNOWN"
VITE_PROXY_STATUS="UNKNOWN"

# Detect frontend mode by checking process on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    # Get the first PID listening on port 3000
    FRONTEND_PORT_PID=$(lsof -ti:3000 | head -1)
    if [ -n "$FRONTEND_PORT_PID" ]; then
        FRONTEND_CMD=$(ps -p $FRONTEND_PORT_PID -o command= 2>/dev/null | tr -d '\n')
        if echo "$FRONTEND_CMD" | grep -q "vite preview"; then
            FRONTEND_MODE="PRODUCTION"
        elif echo "$FRONTEND_CMD" | grep -q "vite"; then
            FRONTEND_MODE="DEVELOPMENT"
        fi
        
        # Try to detect VITE_USE_PROXY from environment or command
        if echo "$FRONTEND_CMD" | grep -q "VITE_USE_PROXY=false"; then
            VITE_PROXY_STATUS="DISABLED"
        elif echo "$FRONTEND_CMD" | grep -q "VITE_USE_PROXY=true"; then
            VITE_PROXY_STATUS="ENABLED"
        fi
    fi
fi

# Detect backend mode by checking process on port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    BACKEND_PORT_PID=$(lsof -ti:3001 | head -1)
    if [ -n "$BACKEND_PORT_PID" ]; then
        BACKEND_CMD=$(ps -p $BACKEND_PORT_PID -o command= 2>/dev/null | tr -d '\n')
        # Check for NODE_ENV in the command or try to get from process environment
        if echo "$BACKEND_CMD" | grep -q "NODE_ENV=production"; then
            BACKEND_MODE="PRODUCTION"
        elif echo "$BACKEND_CMD" | grep -q "NODE_ENV=development"; then
            BACKEND_MODE="DEVELOPMENT"
        else
            # Try to get from process environment (works on Linux, may not work on macOS)
            BACKEND_ENV=$(ps e -p $BACKEND_PORT_PID -o command= 2>/dev/null | grep -o "NODE_ENV=[^ ]*" | head -1)
            if echo "$BACKEND_ENV" | grep -q "NODE_ENV=production"; then
                BACKEND_MODE="PRODUCTION"
            elif echo "$BACKEND_ENV" | grep -q "NODE_ENV=development"; then
                BACKEND_MODE="DEVELOPMENT"
            fi
        fi
    fi
fi

# Fallback: Check log files for mode indicators
if [ "$BACKEND_MODE" = "UNKNOWN" ] && [ -f "$LOG_DIR/backend.log" ]; then
    if tail -n 20 "$LOG_DIR/backend.log" 2>/dev/null | grep -q "NODE_ENV=production\|PRODUCTION mode"; then
        BACKEND_MODE="PRODUCTION"
    elif tail -n 20 "$LOG_DIR/backend.log" 2>/dev/null | grep -q "NODE_ENV=development\|DEVELOPMENT mode"; then
        BACKEND_MODE="DEVELOPMENT"
    fi
fi

if [ "$FRONTEND_MODE" = "UNKNOWN" ] && [ -f "$LOG_DIR/frontend.log" ]; then
    if tail -n 20 "$LOG_DIR/frontend.log" 2>/dev/null | grep -q "preview\|PRODUCTION"; then
        FRONTEND_MODE="PRODUCTION"
    elif tail -n 20 "$LOG_DIR/frontend.log" 2>/dev/null | grep -q "dev server\|DEVELOPMENT"; then
        FRONTEND_MODE="DEVELOPMENT"
    fi
fi

if [ "$VITE_PROXY_STATUS" = "UNKNOWN" ] && [ -f "$LOG_DIR/frontend.log" ] && [ "$FRONTEND_MODE" = "PRODUCTION" ]; then
    if tail -n 20 "$LOG_DIR/frontend.log" 2>/dev/null | grep -q "VITE_USE_PROXY=false\|proxy: DISABLED"; then
        VITE_PROXY_STATUS="DISABLED"
    elif tail -n 20 "$LOG_DIR/frontend.log" 2>/dev/null | grep -q "VITE_USE_PROXY=true\|proxy: ENABLED"; then
        VITE_PROXY_STATUS="ENABLED"
    fi
fi

# Display mode information
echo "Server Configuration:"
if [ "$FRONTEND_MODE" != "UNKNOWN" ] || [ "$BACKEND_MODE" != "UNKNOWN" ]; then
    if [ "$FRONTEND_MODE" = "$BACKEND_MODE" ] && [ "$FRONTEND_MODE" != "UNKNOWN" ]; then
        echo "  Mode: $FRONTEND_MODE"
    else
        if [ "$BACKEND_MODE" != "UNKNOWN" ]; then
            echo "  Backend Mode: $BACKEND_MODE"
        fi
        if [ "$FRONTEND_MODE" != "UNKNOWN" ]; then
            echo "  Frontend Mode: $FRONTEND_MODE"
        fi
    fi
    if [ "$VITE_PROXY_STATUS" != "UNKNOWN" ] && [ "$FRONTEND_MODE" = "PRODUCTION" ]; then
        echo "  Vite Proxy: $VITE_PROXY_STATUS"
    elif [ "$FRONTEND_MODE" = "DEVELOPMENT" ]; then
        echo "  Vite Proxy: ENABLED (required for development)"
    fi
else
    echo "  Mode: Not detected (servers may not be running)"
fi
echo ""

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
            # Try to detect backend mode from this specific PID
            BACKEND_CMD=$(ps -p $BACKEND_PID -o command= 2>/dev/null | tr -d '\n')
            BACKEND_PID_MODE=""
            if echo "$BACKEND_CMD" | grep -q "NODE_ENV=production"; then
                BACKEND_PID_MODE=" (PRODUCTION)"
            elif echo "$BACKEND_CMD" | grep -q "NODE_ENV=development"; then
                BACKEND_PID_MODE=" (DEVELOPMENT)"
            fi
            echo "  Backend (PID $BACKEND_PID):  ✓ Running$BACKEND_PID_MODE"
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
            # Check Vite proxy status for this specific PID
            FRONTEND_PID_PROXY=""
            if echo "$FRONTEND_CMD" | grep -q "VITE_USE_PROXY=false"; then
                FRONTEND_PID_PROXY=", no proxy"
            elif echo "$FRONTEND_CMD" | grep -q "VITE_USE_PROXY=true"; then
                FRONTEND_PID_PROXY=", with proxy"
            fi
            
            if [ -n "$FRONTEND_MODE" ]; then
                echo "  Frontend (PID $FRONTEND_PID): ✓ Running ($FRONTEND_MODE$FRONTEND_PID_PROXY)"
            else
                echo "  Frontend (PID $FRONTEND_PID): ✓ Running$FRONTEND_PID_PROXY"
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
