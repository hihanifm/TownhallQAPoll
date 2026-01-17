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

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Servers may not be running."
    echo "Checking for running processes..."
    
    # Try to find and kill by port
    BACKEND_PID=$(lsof -ti:3001 2>/dev/null)
    FRONTEND_PID=$(lsof -ti:3000 2>/dev/null)
    
    if [ -z "$BACKEND_PID" ] && [ -z "$FRONTEND_PID" ]; then
        echo "No servers found running on ports 3000 or 3001."
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

echo "Stopping Townhall Q&A Poll servers..."
echo "Version: $VERSION"
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
BACKEND_PORT_PID=$(lsof -ti:3001 2>/dev/null)
FRONTEND_PORT_PID=$(lsof -ti:3000 2>/dev/null)

if [ -n "$BACKEND_PORT_PID" ]; then
    echo "Killing process on port 3001 (PID: $BACKEND_PORT_PID)..."
    kill -9 $BACKEND_PORT_PID 2>/dev/null
fi

if [ -n "$FRONTEND_PORT_PID" ]; then
    echo "Killing process on port 3000 (PID: $FRONTEND_PORT_PID)..."
    kill -9 $FRONTEND_PORT_PID 2>/dev/null
fi

# Remove PID file
if [ -f "$PID_FILE" ]; then
    rm "$PID_FILE"
    echo "✓ PID file removed"
fi

echo ""
echo "All servers stopped."
