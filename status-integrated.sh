#!/bin/bash

# Script to check the status of integrated servers
# LINUX/macOS ONLY

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/integrated.pids"
LOG_DIR="$SCRIPT_DIR/logs"

# Function to get local IP address
get_local_ip() {
    local ip=""
    
    if command -v ip >/dev/null 2>&1; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1)
    fi
    
    if [ -z "$ip" ] && command -v ifconfig >/dev/null 2>&1; then
        ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    fi
    
    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    
    echo "$ip"
}

echo "Integrated Setup Server Status"
echo "================================"
echo ""

# Check PID file
if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Servers may not be running via start-integrated.sh"
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
        TOWNHALL_BACKEND_PID=${PIDS[0]}
        if ps -p $TOWNHALL_BACKEND_PID > /dev/null 2>&1; then
            echo "  TownhallQAPoll Backend (PID $TOWNHALL_BACKEND_PID):  ✓ Running"
        else
            echo "  TownhallQAPoll Backend (PID $TOWNHALL_BACKEND_PID):  ✗ Not running"
        fi
    fi
    
    if [ ${#PIDS[@]} -ge 2 ]; then
        DISCUSSION_BACKEND_PID=${PIDS[1]}
        if ps -p $DISCUSSION_BACKEND_PID > /dev/null 2>&1; then
            echo "  DiscussionApp Backend (PID $DISCUSSION_BACKEND_PID):   ✓ Running"
        else
            echo "  DiscussionApp Backend (PID $DISCUSSION_BACKEND_PID):   ✗ Not running"
        fi
    fi
    
    if [ ${#PIDS[@]} -ge 3 ]; then
        TOWNHALL_FRONTEND_PID=${PIDS[2]}
        if ps -p $TOWNHALL_FRONTEND_PID > /dev/null 2>&1; then
            echo "  TownhallQAPoll Frontend (PID $TOWNHALL_FRONTEND_PID): ✓ Running"
        else
            echo "  TownhallQAPoll Frontend (PID $TOWNHALL_FRONTEND_PID): ✗ Not running"
        fi
    fi
    echo ""
fi

# Check by port
echo "Port status:"
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:3001 | head -1)
    echo "  Port 3001 (TownhallQAPoll Backend):  ✓ In use (PID: $PORT_PID)"
else
    echo "  Port 3001 (TownhallQAPoll Backend):  ✗ Not in use"
fi

if lsof -Pi :4001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:4001 | head -1)
    echo "  Port 4001 (DiscussionApp Backend):   ✓ In use (PID: $PORT_PID)"
else
    echo "  Port 4001 (DiscussionApp Backend):   ✗ Not in use"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:3000 | head -1)
    echo "  Port 3000 (TownhallQAPoll Frontend): ✓ In use (PID: $PORT_PID)"
else
    echo "  Port 3000 (TownhallQAPoll Frontend): ✗ Not in use"
fi

echo ""

# Show access URLs
LOCAL_IP=$(get_local_ip)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :4001 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Access URLs:"
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  TownhallQAPoll Backend:"
        echo "    - Local:  http://localhost:3001"
        if [ -n "$LOCAL_IP" ]; then
            echo "    - Network: http://$LOCAL_IP:3001"
        fi
    fi
    if lsof -Pi :4001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  DiscussionApp Backend:"
        echo "    - Local:  http://localhost:4001"
        if [ -n "$LOCAL_IP" ]; then
            echo "    - Network: http://$LOCAL_IP:4001"
        fi
    fi
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  TownhallQAPoll Frontend:"
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
    if [ -f "$LOG_DIR/townhall-backend.log" ]; then
        BACKEND_SIZE=$(du -h "$LOG_DIR/townhall-backend.log" 2>/dev/null | cut -f1)
        echo "  TownhallQAPoll Backend:  $LOG_DIR/townhall-backend.log ($BACKEND_SIZE)"
    fi
    if [ -f "$LOG_DIR/discussion-backend.log" ]; then
        BACKEND_SIZE=$(du -h "$LOG_DIR/discussion-backend.log" 2>/dev/null | cut -f1)
        echo "  DiscussionApp Backend:   $LOG_DIR/discussion-backend.log ($BACKEND_SIZE)"
    fi
    if [ -f "$LOG_DIR/townhall-frontend.log" ]; then
        FRONTEND_SIZE=$(du -h "$LOG_DIR/townhall-frontend.log" 2>/dev/null | cut -f1)
        echo "  TownhallQAPoll Frontend: $LOG_DIR/townhall-frontend.log ($FRONTEND_SIZE)"
    fi
    if [ -f "$LOG_DIR/townhall-frontend-build.log" ]; then
        BUILD_SIZE=$(du -h "$LOG_DIR/townhall-frontend-build.log" 2>/dev/null | cut -f1)
        echo "  Frontend Build Log:      $LOG_DIR/townhall-frontend-build.log ($BUILD_SIZE)"
    fi
    echo ""
    echo "To view logs:"
    echo "  tail -f $LOG_DIR/townhall-backend.log"
    echo "  tail -f $LOG_DIR/discussion-backend.log"
    echo "  tail -f $LOG_DIR/townhall-frontend.log"
fi

echo ""

