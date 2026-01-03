#!/bin/bash

# Script to stop integrated servers
# LINUX/macOS ONLY

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/integrated.pids"

echo "Stopping Integrated Setup servers..."
echo ""

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Servers may not be running via start-integrated.sh"
    echo "Checking for running processes on ports..."
    
    # Try to find and kill by port
    TOWNHALL_BACKEND_PID=$(lsof -ti:3001 2>/dev/null)
    DISCUSSION_BACKEND_PID=$(lsof -ti:4001 2>/dev/null)
    TOWNHALL_FRONTEND_PID=$(lsof -ti:3000 2>/dev/null)
    
    if [ -z "$TOWNHALL_BACKEND_PID" ] && [ -z "$DISCUSSION_BACKEND_PID" ] && [ -z "$TOWNHALL_FRONTEND_PID" ]; then
        echo "No servers found running on ports 3000, 3001, or 4001."
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
    
    TOWNHALL_BACKEND_PID=${PIDS[0]}
    DISCUSSION_BACKEND_PID=${PIDS[1]}
    TOWNHALL_FRONTEND_PID=${PIDS[2]}
fi

# Stop TownhallQAPoll backend
if [ -n "$TOWNHALL_BACKEND_PID" ] && ps -p $TOWNHALL_BACKEND_PID > /dev/null 2>&1; then
    echo "Stopping TownhallQAPoll backend server (PID: $TOWNHALL_BACKEND_PID)..."
    kill $TOWNHALL_BACKEND_PID 2>/dev/null
    sleep 1
    if ps -p $TOWNHALL_BACKEND_PID > /dev/null 2>&1; then
        kill -9 $TOWNHALL_BACKEND_PID 2>/dev/null
    fi
    echo "✓ TownhallQAPoll backend stopped"
else
    echo "TownhallQAPoll backend server not found (may already be stopped)"
fi

# Stop DiscussionApp backend
if [ -n "$DISCUSSION_BACKEND_PID" ] && ps -p $DISCUSSION_BACKEND_PID > /dev/null 2>&1; then
    echo "Stopping DiscussionApp backend server (PID: $DISCUSSION_BACKEND_PID)..."
    kill $DISCUSSION_BACKEND_PID 2>/dev/null
    sleep 1
    if ps -p $DISCUSSION_BACKEND_PID > /dev/null 2>&1; then
        kill -9 $DISCUSSION_BACKEND_PID 2>/dev/null
    fi
    echo "✓ DiscussionApp backend stopped"
else
    echo "DiscussionApp backend server not found (may already be stopped)"
fi

# Stop TownhallQAPoll frontend
if [ -n "$TOWNHALL_FRONTEND_PID" ] && ps -p $TOWNHALL_FRONTEND_PID > /dev/null 2>&1; then
    echo "Stopping TownhallQAPoll frontend server (PID: $TOWNHALL_FRONTEND_PID)..."
    kill $TOWNHALL_FRONTEND_PID 2>/dev/null
    sleep 1
    if ps -p $TOWNHALL_FRONTEND_PID > /dev/null 2>&1; then
        kill -9 $TOWNHALL_FRONTEND_PID 2>/dev/null
    fi
    echo "✓ TownhallQAPoll frontend stopped"
else
    echo "TownhallQAPoll frontend server not found (may already be stopped)"
fi

# Clean up any remaining processes on the ports
TOWNHALL_BACKEND_PORT_PID=$(lsof -ti:3001 2>/dev/null)
DISCUSSION_BACKEND_PORT_PID=$(lsof -ti:4001 2>/dev/null)
TOWNHALL_FRONTEND_PORT_PID=$(lsof -ti:3000 2>/dev/null)

if [ -n "$TOWNHALL_BACKEND_PORT_PID" ]; then
    echo "Killing process on port 3001 (PID: $TOWNHALL_BACKEND_PORT_PID)..."
    kill -9 $TOWNHALL_BACKEND_PORT_PID 2>/dev/null
fi

if [ -n "$DISCUSSION_BACKEND_PORT_PID" ]; then
    echo "Killing process on port 4001 (PID: $DISCUSSION_BACKEND_PORT_PID)..."
    kill -9 $DISCUSSION_BACKEND_PORT_PID 2>/dev/null
fi

if [ -n "$TOWNHALL_FRONTEND_PORT_PID" ]; then
    echo "Killing process on port 3000 (PID: $TOWNHALL_FRONTEND_PORT_PID)..."
    kill -9 $TOWNHALL_FRONTEND_PORT_PID 2>/dev/null
fi

# Remove PID file
if [ -f "$PID_FILE" ]; then
    rm "$PID_FILE"
    echo "✓ PID file removed"
fi

echo ""
echo "All servers stopped."

