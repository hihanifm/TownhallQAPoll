#!/bin/bash

# Script to stop both backend and frontend servers
# LINUX/macOS ONLY

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/server.pids"

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

echo "Stopping Townhall Q&A Poll servers..."
echo "Version: $VERSION"
echo ""

# Check if PM2 process is running
PM2_RUNNING=false
if command -v pm2 >/dev/null 2>&1; then
    if pm2 list 2>/dev/null | grep -q "townhall-backend"; then
        PM2_RUNNING=true
    fi
fi

# If PM2 process is running, stop it
if [ "$PM2_RUNNING" = true ]; then
    echo "Detected PM2 process (production PM2 mode)"
    echo "Stopping PM2 process..."
    pm2 stop townhall-backend 2>/dev/null || true
    pm2 delete townhall-backend 2>/dev/null || true
    echo "✓ PM2 process stopped"
    echo ""
    echo "All servers stopped."
    exit 0
fi

# Otherwise, handle nohup processes (dev or prod-nohup mode)
if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Servers may not be running."
    echo "Checking for running processes..."
    
    # Try to find and kill by port
    BACKEND_PID=$(lsof -ti:33001 2>/dev/null)
    FRONTEND_PID=$(lsof -ti:33000 2>/dev/null)
    
    if [ -z "$BACKEND_PID" ] && [ -z "$FRONTEND_PID" ]; then
        echo "No servers found running on ports 33000 or 33001."
        exit 0
    fi
else
    # Read PIDs from file
    PIDS=()
    while IFS= read -r pid; do
        if [ -n "$pid" ]; then
            PIDS+=($pid)
        fi
    done < "$PID_FILE"
    
    BACKEND_PID=${PIDS[0]}
    FRONTEND_PID=${PIDS[1]}
fi

echo "Detected nohup processes (dev or production nohup mode)"
echo ""

# Stop backend
if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "Stopping backend server (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    sleep 1
    # Force kill if still running
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill -9 $BACKEND_PID 2>/dev/null
    fi
    echo "✓ Backend stopped"
else
    echo "Backend server not found (may already be stopped)"
fi

# Stop frontend
if [ -n "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo "Stopping frontend server (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    sleep 1
    # Force kill if still running
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill -9 $FRONTEND_PID 2>/dev/null
    fi
    echo "✓ Frontend stopped"
else
    echo "Frontend server not found (may already be stopped)"
fi

# Clean up any remaining processes on the ports
BACKEND_PORT_PID=$(lsof -ti:33001 2>/dev/null)
FRONTEND_PORT_PID=$(lsof -ti:33000 2>/dev/null)

if [ -n "$BACKEND_PORT_PID" ]; then
    echo "Killing process on port 33001 (PID: $BACKEND_PORT_PID)..."
    kill -9 $BACKEND_PORT_PID 2>/dev/null
fi

if [ -n "$FRONTEND_PORT_PID" ]; then
    echo "Killing process on port 33000 (PID: $FRONTEND_PORT_PID)..."
    kill -9 $FRONTEND_PORT_PID 2>/dev/null
fi

# Remove PID file
if [ -f "$PID_FILE" ]; then
    rm "$PID_FILE"
    echo "✓ PID file removed"
fi

echo ""
echo "All servers stopped."
