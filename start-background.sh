#!/bin/bash

# Script to start both backend and frontend servers in the background
# LINUX/macOS ONLY
# Usage: ./start-background.sh [--prod|-p]  (use --prod for production mode)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/server.pids"
LOG_DIR="$SCRIPT_DIR/logs"

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

# Check for production mode
PROD_MODE=false
if [[ "$1" == "--prod" ]] || [[ "$1" == "-p" ]]; then
    PROD_MODE=true
fi

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
PORTS_IN_USE=false
if [ -f "$PID_FILE" ]; then
    echo "Checking for existing servers..."
    while IFS= read -r pid; do
        if ps -p $pid > /dev/null 2>&1; then
            echo "⚠️  Warning: Server with PID $pid is already running!"
            PORTS_IN_USE=true
        fi
    done < "$PID_FILE"
fi

# Check if ports are in use (more reliable check)
BACKEND_PORT_IN_USE=false
FRONTEND_PORT_IN_USE=false

if check_port 33001; then
    BACKEND_PORT_IN_USE=true
    PORTS_IN_USE=true
    echo "⚠️  Error: Port 33001 (backend) is already in use!"
fi

# In production mode, backend serves static files, so we only need port 33001
# In development mode, we need both ports
if [ "$PROD_MODE" = false ]; then
    if check_port 33000; then
        FRONTEND_PORT_IN_USE=true
        PORTS_IN_USE=true
        echo "⚠️  Error: Port 33000 (frontend) is already in use!"
    fi
fi

# If ports are in use, exit unless user explicitly overrides
if [ "$PORTS_IN_USE" = true ]; then
    echo ""
    echo "❌ Cannot start servers - ports are already in use or servers are running!"
    echo "   Run ./stop-background.sh to stop existing servers first."
    echo "   Or check status with: ./status-background.sh"
    echo ""
    read -p "Force start anyway? (not recommended) (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please stop existing servers first."
        exit 1
    fi
    echo "⚠️  Warning: Forcing start - this may cause conflicts!"
fi

if [ "$PROD_MODE" = true ]; then
    echo "Starting Townhall Q&A Poll in PRODUCTION mode (single process)..."
else
    echo "Starting Townhall Q&A Poll servers in DEVELOPMENT mode..."
fi
echo "Version: $VERSION"
echo ""

# In production mode, build frontend first, then start backend (which serves static files)
# In development mode, start backend first, then frontend dev server
if [ "$PROD_MODE" = true ]; then
    echo "Building frontend for production..."
    cd "$SCRIPT_DIR/frontend"
    npm run build > "$LOG_DIR/frontend-build.log" 2>&1
    if [ $? -ne 0 ]; then
        echo "❌ Error: Frontend build failed! Check $LOG_DIR/frontend-build.log"
        exit 1
    fi
    echo "✓ Frontend built successfully"
    echo ""
fi

# Start backend server
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"

# Set NODE_ENV based on mode
if [ "$PROD_MODE" = true ]; then
    export NODE_ENV=production
    export HOST=0.0.0.0  # Bind to all interfaces so it's accessible from network
    echo "  Setting NODE_ENV=production"
    echo "  Setting HOST=0.0.0.0 (accessible from network)"
else
    export NODE_ENV=development
    echo "  Setting NODE_ENV=development"
fi

nohup env NODE_ENV=$NODE_ENV HOST=${HOST:-} npm start > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
# Disown the process to fully detach it from the shell
disown $BACKEND_PID 2>/dev/null || true

# Wait a moment and verify backend started successfully
sleep 3
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "❌ Error: Backend server failed to start! Check $LOG_DIR/backend.log"
    # Check if it's a port conflict
    if grep -q "EADDRINUSE" "$LOG_DIR/backend.log" 2>/dev/null; then
        echo "   Port 33001 is already in use. Please stop the existing server first."
    fi
    exit 1
fi

if ! check_port 33001; then
    echo "❌ Error: Backend server process started but port 33001 is not listening!"
    echo "   Check $LOG_DIR/backend.log for errors"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✓ Backend started successfully with PID: $BACKEND_PID"

# Save backend PID to file
echo "$BACKEND_PID" > "$PID_FILE"

# Only start frontend server in development mode
# In production mode, backend serves static files, so no separate frontend server needed
if [ "$PROD_MODE" = false ]; then
    # Start frontend server
    echo "Starting frontend server..."
    cd "$SCRIPT_DIR/frontend"
    echo "Starting frontend development server..."
    nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    
    FRONTEND_PID=$!
    # Disown the process to fully detach it from the shell
    disown $FRONTEND_PID 2>/dev/null || true
    
    # Wait a moment and verify frontend started successfully
    sleep 3
    if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "❌ Error: Frontend server failed to start! Check $LOG_DIR/frontend.log"
        # Clean up: kill backend if frontend failed
        kill $BACKEND_PID 2>/dev/null || true
        # Check if it's a port conflict
        if grep -q "EADDRINUSE" "$LOG_DIR/frontend.log" 2>/dev/null; then
            echo "   Port 33000 is already in use. Please stop the existing server first."
        fi
        exit 1
    fi
    
    if ! check_port 33000; then
        echo "❌ Error: Frontend server process started but port 33000 is not listening!"
        echo "   Check $LOG_DIR/frontend.log for errors"
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    
    echo "✓ Frontend started successfully with PID: $FRONTEND_PID"
    
    # Add frontend PID to file
    echo "$FRONTEND_PID" >> "$PID_FILE"
fi

# Get local IP address
LOCAL_IP=$(get_local_ip)

echo ""
if [ "$PROD_MODE" = true ]; then
    echo "✓ Server started in background!"
    echo "  Mode: PRODUCTION (single process - backend serves static frontend)"
else
    echo "✓ Servers started in background!"
    echo "  Mode: DEVELOPMENT (hot reload enabled)"
fi
echo ""
echo "Access URLs:"
if [ "$PROD_MODE" = true ]; then
    echo "  Application:"
    echo "    - Local:  http://localhost:33001"
    if [ -n "$LOCAL_IP" ]; then
        echo "    - Network: http://$LOCAL_IP:33001"
    fi
    echo "    (Backend serves both API and frontend)"
else
    echo "  Backend:"
    echo "    - Local:  http://localhost:33001"
    if [ -n "$LOCAL_IP" ]; then
        echo "    - Network: http://$LOCAL_IP:33001"
    fi
    echo "  Frontend:"
    echo "    - Local:  http://localhost:33000"
    if [ -n "$LOCAL_IP" ]; then
        echo "    - Network: http://$LOCAL_IP:33000"
    fi
fi
echo ""
echo "Logs are available in: $LOG_DIR/"
echo "  - Backend:  $LOG_DIR/backend.log"
if [ "$PROD_MODE" = true ]; then
    echo "  - Build:    $LOG_DIR/frontend-build.log"
else
    echo "  - Frontend: $LOG_DIR/frontend.log"
fi
echo ""
echo "To stop the servers, run: ./stop-background.sh"
echo "To check status, run: ./status-background.sh"
echo ""
if [ "$PROD_MODE" = false ]; then
    echo "To start in production mode, run: ./start-background.sh --prod"
    echo ""
fi
echo "Note: Processes are running in the background and will continue"
echo "      even if you close this terminal window."
echo ""
