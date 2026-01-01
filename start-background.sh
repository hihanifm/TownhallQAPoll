#!/bin/bash

# Script to start both backend and frontend servers in the background
# LINUX/macOS ONLY
# Usage: ./start-background.sh [--prod|-p] [--vite-proxy|-vp] [--pm2|-pm2]
#   --prod, -p: Start in production mode (default: no Vite proxy, direct backend calls)
#   --vite-proxy, -vp: Enable Vite proxy (only valid in production mode)
#   --pm2, -pm2: Use PM2 process manager instead of nohup

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/server.pids"
LOG_DIR="$SCRIPT_DIR/logs"
PM2_FLAG_FILE="$SCRIPT_DIR/.using-pm2"

# Parse command line arguments
PROD_MODE=false
VITE_PROXY=false
USE_PM2=false

for arg in "$@"; do
    case $arg in
        --prod|-p)
            PROD_MODE=true
            ;;
        --vite-proxy|-vp)
            VITE_PROXY=true
            ;;
        --pm2|-pm2)
            USE_PM2=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: ./start-background.sh [--prod|-p] [--vite-proxy|-vp] [--pm2|-pm2]"
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
    echo "  ./start-background.sh --prod --vite-proxy"
    echo "  or: ./start-background.sh -p -vp"
    echo ""
    exit 1
fi

# Check if PM2 is installed when --pm2 is used
if [ "$USE_PM2" = true ]; then
    if ! command -v pm2 &> /dev/null; then
        echo "❌ Error: PM2 is not installed!"
        echo ""
        echo "Install PM2 with: npm install -g pm2"
        echo "Or run without --pm2 flag to use regular background mode"
        echo ""
        exit 1
    fi
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

if check_port 3001; then
    BACKEND_PORT_IN_USE=true
    PORTS_IN_USE=true
    echo "⚠️  Error: Port 3001 (backend) is already in use!"
fi

if check_port 3000; then
    FRONTEND_PORT_IN_USE=true
    PORTS_IN_USE=true
    echo "⚠️  Error: Port 3000 (frontend) is already in use!"
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
    echo "Starting Townhall Q&A Poll servers in PRODUCTION mode..."
else
    echo "Starting Townhall Q&A Poll servers in DEVELOPMENT mode..."
fi
if [ "$USE_PM2" = true ]; then
    echo "Using PM2 process manager"
fi
echo ""

# If using PM2, handle PM2 startup
if [ "$USE_PM2" = true ]; then
    # Stop existing PM2 processes if any
    echo "Checking for existing PM2 processes..."
    pm2 delete ecosystem.config.js 2>/dev/null || true
    
    # Build frontend if production mode
    if [ "$PROD_MODE" = true ]; then
        echo "Building frontend for production..."
        cd "$SCRIPT_DIR/frontend"
        if [ "$VITE_PROXY" = true ]; then
            VITE_USE_PROXY=true VITE_API_URL=http://localhost:3001 npm run build > "$LOG_DIR/frontend-build.log" 2>&1
        else
            VITE_USE_PROXY=false VITE_API_URL=http://localhost:3001 npm run build > "$LOG_DIR/frontend-build.log" 2>&1
        fi
        if [ $? -ne 0 ]; then
            echo "❌ Error: Frontend build failed! Check $LOG_DIR/frontend-build.log"
            exit 1
        fi
        echo "✓ Frontend built successfully"
        cd "$SCRIPT_DIR"
        echo ""
    fi
    
    # Determine PM2 environment
    if [ "$PROD_MODE" = true ]; then
        if [ "$VITE_PROXY" = true ]; then
            PM2_ENV="production_proxy"
        else
            PM2_ENV="production"
        fi
    else
        PM2_ENV="development"
    fi
    
    # Start with PM2
    echo "Starting applications with PM2..."
    pm2 start ecosystem.config.js --env $PM2_ENV
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to start PM2 processes!"
        exit 1
    fi
    
    # Save PM2 flag
    echo "pm2" > "$PM2_FLAG_FILE"
    
    # Wait a moment for processes to start
    sleep 3
    
    # Verify processes are running
    if ! pm2 list | grep -q "townhall-backend.*online"; then
        echo "❌ Error: Backend failed to start with PM2!"
        pm2 logs townhall-backend --lines 10 --nostream
        exit 1
    fi
    
    if ! pm2 list | grep -q "townhall-frontend.*online"; then
        echo "❌ Error: Frontend failed to start with PM2!"
        pm2 logs townhall-frontend --lines 10 --nostream
        exit 1
    fi
    
    echo "✓ Applications started with PM2"
    echo ""
    
    # Get local IP address
    LOCAL_IP=$(get_local_ip)
    
    echo "✓ Servers started with PM2!"
    if [ "$PROD_MODE" = true ]; then
        echo "  Mode: PRODUCTION (optimized build)"
    else
        echo "  Mode: DEVELOPMENT (hot reload enabled)"
    fi
    if [ "$PROD_MODE" = true ]; then
        if [ "$VITE_PROXY" = true ]; then
            echo "  API Mode: Vite proxy enabled"
        else
            echo "  API Mode: Direct backend calls (no Vite proxy - default)"
        fi
    else
        echo "  API Mode: Vite proxy enabled (required for development)"
    fi
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
    echo "PM2 Management:"
    echo "  pm2 status              - Check status"
    echo "  pm2 logs                - View logs"
    echo "  pm2 restart all         - Restart all"
    echo "  ./stop-background.sh    - Stop servers"
    echo ""
    echo "Logs are available via: pm2 logs"
    echo "  - Backend:  pm2 logs townhall-backend"
    echo "  - Frontend: pm2 logs townhall-frontend"
    if [ "$PROD_MODE" = true ]; then
        echo "  - Build:    $LOG_DIR/frontend-build.log"
    fi
    echo ""
    exit 0
fi

# Regular background mode (nohup) - existing logic
# Start backend server
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"

# Set environment variables for backend
if [ "$PROD_MODE" = true ]; then
    export NODE_ENV=production
    echo "  Setting NODE_ENV=production"
else
    export NODE_ENV=development
    echo "  Setting NODE_ENV=development"
fi

# Set PORT and HOST for backend (consistent with PM2)
export PORT=${PORT:-3001}
export HOST=${HOST:-127.0.0.1}
echo "  Setting PORT=$PORT"
echo "  Setting HOST=$HOST"

nohup env NODE_ENV=$NODE_ENV PORT=$PORT HOST=$HOST npm start > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
# Disown the process to fully detach it from the shell
disown $BACKEND_PID 2>/dev/null || true

# Wait a moment and verify backend started successfully
sleep 3
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "❌ Error: Backend server failed to start! Check $LOG_DIR/backend.log"
    # Check if it's a port conflict
    if grep -q "EADDRINUSE" "$LOG_DIR/backend.log" 2>/dev/null; then
        echo "   Port 3001 is already in use. Please stop the existing server first."
    fi
    exit 1
fi

if ! check_port 3001; then
    echo "❌ Error: Backend server process started but port 3001 is not listening!"
    echo "   Check $LOG_DIR/backend.log for errors"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✓ Backend started successfully with PID: $BACKEND_PID"

# Start frontend server
echo "Starting frontend server..."
cd "$SCRIPT_DIR/frontend"

# Set environment variables for frontend
# Production defaults to no proxy (direct calls), can be enabled with --vite-proxy
# Development always uses proxy
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

# Set VITE_API_URL (consistent with PM2)
export VITE_API_URL=${VITE_API_URL:-http://localhost:3001}
echo "  Backend URL: $VITE_API_URL"

# Set PORT for frontend (consistent with PM2)
export PORT=${PORT:-3000}
echo "  Setting PORT=$PORT"

if [ "$PROD_MODE" = true ]; then
    export NODE_ENV=production
    echo "  Setting NODE_ENV=production"
    echo "Building frontend for production..."
    # Build with the same env vars that will be used at runtime
    env NODE_ENV=$NODE_ENV VITE_USE_PROXY=$VITE_USE_PROXY VITE_API_URL=$VITE_API_URL npm run build > "$LOG_DIR/frontend-build.log" 2>&1
    if [ $? -ne 0 ]; then
        echo "❌ Error: Frontend build failed! Check $LOG_DIR/frontend-build.log"
        # Clean up: kill backend if it was started
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    echo "Starting frontend production server..."
    nohup env NODE_ENV=$NODE_ENV PORT=$PORT VITE_USE_PROXY=$VITE_USE_PROXY VITE_API_URL=$VITE_API_URL npm run preview > "$LOG_DIR/frontend.log" 2>&1 &
else
    export NODE_ENV=development
    echo "  Setting NODE_ENV=development"
    echo "Starting frontend development server..."
    nohup env NODE_ENV=$NODE_ENV PORT=$PORT VITE_USE_PROXY=$VITE_USE_PROXY VITE_API_URL=$VITE_API_URL npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
fi

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
        echo "   Port 3000 is already in use. Please stop the existing server first."
    fi
    exit 1
fi

if ! check_port 3000; then
    echo "❌ Error: Frontend server process started but port 3000 is not listening!"
    echo "   Check $LOG_DIR/frontend.log for errors"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo "✓ Frontend started successfully with PID: $FRONTEND_PID"

# Save PIDs to file and remove PM2 flag if it exists
echo "$BACKEND_PID" > "$PID_FILE"
echo "$FRONTEND_PID" >> "$PID_FILE"
rm -f "$PM2_FLAG_FILE" 2>/dev/null || true

# Get local IP address
LOCAL_IP=$(get_local_ip)

echo ""
echo "✓ Servers started in background!"
if [ "$PROD_MODE" = true ]; then
    echo "  Mode: PRODUCTION (optimized build)"
else
    echo "  Mode: DEVELOPMENT (hot reload enabled)"
fi
if [ "$PROD_MODE" = true ]; then
    if [ "$VITE_PROXY" = true ]; then
        echo "  API Mode: Vite proxy enabled"
    else
        echo "  API Mode: Direct backend calls (no Vite proxy - default)"
    fi
else
    echo "  API Mode: Vite proxy enabled (required for development)"
fi
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
if [ "$PROD_MODE" = true ]; then
    echo "  - Build:    $LOG_DIR/frontend-build.log"
fi
echo ""
echo "To stop the servers, run: ./stop-background.sh"
echo "To check status, run: ./status-background.sh"
echo ""
if [ "$PROD_MODE" = false ]; then
    echo "To start in production mode, run: ./start-background.sh --prod"
fi
if [ "$PROD_MODE" = true ] && [ "$VITE_PROXY" = false ]; then
    echo "To enable Vite proxy in production, run: ./start-background.sh --prod --vite-proxy (or -p -vp)"
    echo ""
fi
echo "Note: Processes are running in the background and will continue"
echo "      even if you close this terminal window."
echo ""
