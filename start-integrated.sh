#!/bin/bash

# Script to start integrated setup: TownhallQAPoll backend, DiscussionApp backend, and TownhallQAPoll frontend
# LINUX/macOS ONLY
# Usage: ./start-integrated.sh [--prod|-p] [--vite-proxy|-vp]
#   --prod, -p: Start in production mode (default: no Vite proxy, direct backend calls)
#   --vite-proxy, -vp: Enable Vite proxy (only valid in production mode)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/integrated.pids"
LOG_DIR="$SCRIPT_DIR/logs"

# Paths to other projects
DISCUSSION_APP_DIR="${DISCUSSION_APP_DIR:-$(dirname "$SCRIPT_DIR")/DiscussionApp}"

# Parse command line arguments
PROD_MODE=false
VITE_PROXY=false

for arg in "$@"; do
    case $arg in
        --prod|-p)
            PROD_MODE=true
            ;;
        --vite-proxy|-vp)
            VITE_PROXY=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: ./start-integrated.sh [--prod|-p] [--vite-proxy|-vp]"
            exit 1
            ;;
    esac
done

# Validate: --vite-proxy can only be used in production mode
if [ "$VITE_PROXY" = true ] && [ "$PROD_MODE" = false ]; then
    echo "❌ Error: --vite-proxy (-vp) can only be used in production mode!"
    echo ""
    echo "The Vite proxy is always enabled in development mode for proper CORS handling."
    echo "To enable proxy in production mode:"
    echo "  ./start-integrated.sh --prod --vite-proxy"
    echo "  or: ./start-integrated.sh -p -vp"
    echo ""
    exit 1
fi

# Check if DiscussionApp directory exists
if [ ! -d "$DISCUSSION_APP_DIR" ]; then
    echo "❌ Error: DiscussionApp directory not found at: $DISCUSSION_APP_DIR"
    echo ""
    echo "Please set DISCUSSION_APP_DIR environment variable or ensure DiscussionApp is in the parent directory."
    echo "Example: export DISCUSSION_APP_DIR=/path/to/DiscussionApp"
    exit 1
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

# Check if servers are already running
if check_port 3001 || check_port 4001 || check_port 3000; then
    echo "⚠️  Warning: One or more ports are already in use!"
    echo ""
    if check_port 3001; then
        echo "  Port 3001 (TownhallQAPoll backend) is in use"
    fi
    if check_port 4001; then
        echo "  Port 4001 (DiscussionApp backend) is in use"
    fi
    if check_port 3000; then
        echo "  Port 3000 (TownhallQAPoll frontend) is in use"
    fi
    echo ""
    echo "Please stop existing servers first or use: ./stop-integrated.sh"
    exit 1
fi

# Check if PID file exists (servers might already be running)
if [ -f "$PID_FILE" ]; then
    echo "⚠️  Warning: PID file exists. Servers may already be running."
    echo "  Use ./status-integrated.sh to check status"
    echo "  Use ./stop-integrated.sh to stop servers"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    rm -f "$PID_FILE"
fi

echo "=========================================="
echo "Starting Integrated Setup"
echo "=========================================="
if [ "$PROD_MODE" = true ]; then
    echo "Mode: PRODUCTION"
else
    echo "Mode: DEVELOPMENT"
fi
echo ""
echo "Servers:"
echo "  - TownhallQAPoll Backend:  http://localhost:3001"
echo "  - DiscussionApp Backend:   http://localhost:4001"
echo "  - TownhallQAPoll Frontend: http://localhost:3000"
echo ""
LOCAL_IP=$(get_local_ip)
if [ -n "$LOCAL_IP" ]; then
    echo "Network access:"
    echo "  - TownhallQAPoll Backend:  http://$LOCAL_IP:3001"
    echo "  - DiscussionApp Backend:   http://$LOCAL_IP:4001"
    echo "  - TownhallQAPoll Frontend: http://$LOCAL_IP:3000"
    echo ""
fi

# Start TownhallQAPoll backend
echo "Starting TownhallQAPoll backend server..."
cd "$SCRIPT_DIR/backend"

# Load .env file if it exists
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    set -a
    source "$SCRIPT_DIR/backend/.env"
    set +a
    echo "  Loaded .env file"
fi

if [ "$PROD_MODE" = true ]; then
    export NODE_ENV=production
    echo "  Setting NODE_ENV=production"
else
    export NODE_ENV=development
    echo "  Setting NODE_ENV=development"
fi

export PORT=${PORT:-3001}
export HOST=${HOST:-127.0.0.1}
echo "  Setting PORT=$PORT"
echo "  Setting HOST=$HOST"

nohup env NODE_ENV=$NODE_ENV PORT=$PORT HOST=$HOST npm start > "$LOG_DIR/townhall-backend.log" 2>&1 &
TOWNHALL_BACKEND_PID=$!
disown $TOWNHALL_BACKEND_PID 2>/dev/null || true

sleep 2
if ! ps -p $TOWNHALL_BACKEND_PID > /dev/null 2>&1; then
    echo "❌ Error: TownhallQAPoll backend failed to start! Check $LOG_DIR/townhall-backend.log"
    if grep -q "EADDRINUSE" "$LOG_DIR/townhall-backend.log" 2>/dev/null; then
        echo "   Port 3001 is already in use."
    fi
    exit 1
fi

if ! check_port 3001; then
    echo "❌ Error: TownhallQAPoll backend process started but port 3001 is not listening!"
    echo "   Check $LOG_DIR/townhall-backend.log for errors"
    kill $TOWNHALL_BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✓ TownhallQAPoll backend started (PID: $TOWNHALL_BACKEND_PID)"

# Start DiscussionApp backend
echo "Starting DiscussionApp backend server..."
cd "$DISCUSSION_APP_DIR/backend"

# Save and clear PORT/HOST to avoid inheriting from previous section
SAVED_TOWNHALL_PORT=$PORT
SAVED_TOWNHALL_HOST=$HOST
unset PORT
unset HOST

# Load .env file if it exists (allows user to override PORT/HOST if needed)
if [ -f "$DISCUSSION_APP_DIR/backend/.env" ]; then
    set -a
    source "$DISCUSSION_APP_DIR/backend/.env"
    set +a
    echo "  Loaded .env file"
fi

if [ "$PROD_MODE" = true ]; then
    export NODE_ENV=production
    echo "  Setting NODE_ENV=production"
else
    export NODE_ENV=development
    echo "  Setting NODE_ENV=development"
fi

# Set PORT (use from .env if set, otherwise default to 4001)
export PORT=${PORT:-4001}
export HOST=${HOST:-127.0.0.1}
echo "  Setting PORT=$PORT"
echo "  Setting HOST=$HOST"

# Restore saved values (though we won't use them, just clean up)
unset SAVED_TOWNHALL_PORT
unset SAVED_TOWNHALL_HOST

nohup env NODE_ENV=$NODE_ENV PORT=$PORT HOST=$HOST npm start > "$LOG_DIR/discussion-backend.log" 2>&1 &
DISCUSSION_BACKEND_PID=$!
disown $DISCUSSION_BACKEND_PID 2>/dev/null || true

sleep 2
if ! ps -p $DISCUSSION_BACKEND_PID > /dev/null 2>&1; then
    echo "❌ Error: DiscussionApp backend failed to start! Check $LOG_DIR/discussion-backend.log"
    echo "   Stopping TownhallQAPoll backend..."
    kill $TOWNHALL_BACKEND_PID 2>/dev/null || true
    if grep -q "EADDRINUSE" "$LOG_DIR/discussion-backend.log" 2>/dev/null; then
        echo "   Port 4001 is already in use."
    fi
    exit 1
fi

if ! check_port 4001; then
    echo "❌ Error: DiscussionApp backend process started but port 4001 is not listening!"
    echo "   Check $LOG_DIR/discussion-backend.log for errors"
    kill $TOWNHALL_BACKEND_PID 2>/dev/null || true
    kill $DISCUSSION_BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✓ DiscussionApp backend started (PID: $DISCUSSION_BACKEND_PID)"

# Start TownhallQAPoll frontend
echo "Starting TownhallQAPoll frontend server..."
cd "$SCRIPT_DIR/frontend"

# Unset PORT to avoid inheriting from backend sections
unset PORT

# Load .env file if it exists
if [ -f "$SCRIPT_DIR/frontend/.env" ]; then
    set -a
    source "$SCRIPT_DIR/frontend/.env"
    set +a
    echo "  Loaded .env file"
fi

# Set environment variables for frontend
if [ "$PROD_MODE" = true ]; then
    if [ "$VITE_PROXY" = true ]; then
        export VITE_USE_PROXY=true
        echo "  Vite proxy: ENABLED (via --vite-proxy flag)"
    else
        export VITE_USE_PROXY=false
        echo "  Vite proxy: DISABLED (default for production - direct backend calls)"
    fi
else
    export VITE_USE_PROXY=true
    echo "  Vite proxy: ENABLED (required for development)"
fi

# Set VITE_API_URL for TownhallQAPoll backend
export VITE_API_URL=${VITE_API_URL:-http://localhost:3001}
echo "  TownhallQAPoll Backend URL: $VITE_API_URL"

# Set VITE_DISCUSSION_API_URL for DiscussionApp backend
export VITE_DISCUSSION_API_URL=${VITE_DISCUSSION_API_URL:-http://localhost:4001}
export VITE_DISCUSSION_USE_PROXY=false
echo "  DiscussionApp Backend URL: $VITE_DISCUSSION_API_URL"

# Set PORT for frontend
export PORT=${PORT:-3000}
echo "  Setting PORT=$PORT"

if [ "$PROD_MODE" = true ]; then
    export NODE_ENV=production
    echo "  Setting NODE_ENV=production"
    echo "Building frontend for production..."
    env NODE_ENV=$NODE_ENV PORT=$PORT VITE_USE_PROXY=$VITE_USE_PROXY VITE_API_URL=$VITE_API_URL VITE_DISCUSSION_API_URL=$VITE_DISCUSSION_API_URL VITE_DISCUSSION_USE_PROXY=$VITE_DISCUSSION_USE_PROXY npm run build > "$LOG_DIR/townhall-frontend-build.log" 2>&1
    if [ $? -ne 0 ]; then
        echo "❌ Error: Frontend build failed! Check $LOG_DIR/townhall-frontend-build.log"
        kill $TOWNHALL_BACKEND_PID 2>/dev/null || true
        kill $DISCUSSION_BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    echo "Starting frontend production server..."
    nohup env NODE_ENV=$NODE_ENV PORT=$PORT VITE_USE_PROXY=$VITE_USE_PROXY VITE_API_URL=$VITE_API_URL VITE_DISCUSSION_API_URL=$VITE_DISCUSSION_API_URL VITE_DISCUSSION_USE_PROXY=$VITE_DISCUSSION_USE_PROXY npm run preview > "$LOG_DIR/townhall-frontend.log" 2>&1 &
else
    export NODE_ENV=development
    echo "  Setting NODE_ENV=development"
    echo "Starting frontend development server..."
    nohup env NODE_ENV=$NODE_ENV PORT=$PORT VITE_USE_PROXY=$VITE_USE_PROXY VITE_API_URL=$VITE_API_URL VITE_DISCUSSION_API_URL=$VITE_DISCUSSION_API_URL VITE_DISCUSSION_USE_PROXY=$VITE_DISCUSSION_USE_PROXY npm run dev > "$LOG_DIR/townhall-frontend.log" 2>&1 &
fi

TOWNHALL_FRONTEND_PID=$!
disown $TOWNHALL_FRONTEND_PID 2>/dev/null || true

sleep 3
if ! ps -p $TOWNHALL_FRONTEND_PID > /dev/null 2>&1; then
    echo "❌ Error: TownhallQAPoll frontend failed to start! Check $LOG_DIR/townhall-frontend.log"
    kill $TOWNHALL_BACKEND_PID 2>/dev/null || true
    kill $DISCUSSION_BACKEND_PID 2>/dev/null || true
    if grep -q "EADDRINUSE" "$LOG_DIR/townhall-frontend.log" 2>/dev/null; then
        echo "   Port 3000 is already in use."
    fi
    exit 1
fi

if ! check_port 3000; then
    echo "❌ Error: TownhallQAPoll frontend process started but port 3000 is not listening!"
    echo "   Check $LOG_DIR/townhall-frontend.log for errors"
    kill $TOWNHALL_BACKEND_PID 2>/dev/null || true
    kill $DISCUSSION_BACKEND_PID 2>/dev/null || true
    kill $TOWNHALL_FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo "✓ TownhallQAPoll frontend started (PID: $TOWNHALL_FRONTEND_PID)"
echo ""

# Save PIDs to file
echo "$TOWNHALL_BACKEND_PID" > "$PID_FILE"
echo "$DISCUSSION_BACKEND_PID" >> "$PID_FILE"
echo "$TOWNHALL_FRONTEND_PID" >> "$PID_FILE"

echo "=========================================="
echo "All servers started successfully!"
echo "=========================================="
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:3000"
echo "  TownhallQAPoll Backend: http://localhost:3001"
echo "  DiscussionApp Backend:  http://localhost:4001"
echo ""
if [ -n "$LOCAL_IP" ]; then
    echo "Network access:"
    echo "  Frontend: http://$LOCAL_IP:3000"
    echo "  TownhallQAPoll Backend: http://$LOCAL_IP:3001"
    echo "  DiscussionApp Backend:  http://$LOCAL_IP:4001"
    echo ""
fi
echo "Log files:"
echo "  TownhallQAPoll Backend:  $LOG_DIR/townhall-backend.log"
echo "  DiscussionApp Backend:   $LOG_DIR/discussion-backend.log"
echo "  TownhallQAPoll Frontend: $LOG_DIR/townhall-frontend.log"
if [ "$PROD_MODE" = true ]; then
    echo "  Frontend Build Log:      $LOG_DIR/townhall-frontend-build.log"
fi
echo ""
echo "To view logs:"
echo "  tail -f $LOG_DIR/townhall-backend.log"
echo "  tail -f $LOG_DIR/discussion-backend.log"
echo "  tail -f $LOG_DIR/townhall-frontend.log"
echo ""
echo "To check status: ./status-integrated.sh"
echo "To stop servers:  ./stop-integrated.sh"
echo ""

