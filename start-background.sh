#!/bin/bash

# Script to start both backend and frontend servers in the background
# LINUX/macOS ONLY
# Usage: 
#   ./start-background.sh           (development mode - nohup)
#   ./start-background.sh -p        (production mode - nohup)
#   ./start-background.sh -pm2      (production mode - PM2 with auto-restart)

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

# Check for mode
MODE="dev"
if [[ "$1" == "--prod" ]] || [[ "$1" == "-p" ]]; then
    MODE="prod-nohup"
elif [[ "$1" == "--pm2" ]] || [[ "$1" == "-pm2" ]]; then
    MODE="prod-pm2"
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

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "linux"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Function to check if ufw is active (Linux)
check_ufw_active() {
    if command -v ufw >/dev/null 2>&1; then
        local status=$(sudo ufw status 2>/dev/null | head -1)
        if echo "$status" | grep -q "Status: active"; then
            return 0
        fi
    fi
    return 1
}

# Function to check if a port is allowed in ufw (Linux)
check_ufw_port_allowed() {
    local port=$1
    if ! check_ufw_active; then
        return 0  # ufw not active, consider port as "allowed"
    fi
    
    # Check if port is explicitly allowed in ufw rules
    if sudo ufw status 2>/dev/null | grep -qE "^[[:space:]]*${port}/tcp[[:space:]]+ALLOW"; then
        return 0
    fi
    
    return 1
}

# Function to check if macOS firewall is active
check_macos_firewall_active() {
    if [ -f "/usr/libexec/ApplicationFirewall/socketfilterfw" ]; then
        local status=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)
        if echo "$status" | grep -q "enabled"; then
            return 0
        fi
    fi
    return 1
}

# Function to check firewall status and warn if ports might be blocked
check_firewall_status() {
    local os=$(detect_os)
    local ports_to_check=()
    local needs_warning=false
    
    # Determine which ports to check based on mode
    if [ "$MODE" = "dev" ]; then
        ports_to_check=(33000 33001)
    else
        ports_to_check=(33001)
    fi
    
    if [ "$os" = "linux" ]; then
        # Check ufw status (Linux)
        echo ""
        echo "🔒 Firewall Check (Linux - ufw):"
        if check_ufw_active; then
            for port in "${ports_to_check[@]}"; do
                if ! check_ufw_port_allowed "$port"; then
                    needs_warning=true
                    echo "   ⚠️  Port $port may be blocked by firewall (ufw)"
                    echo "      To allow access, run: sudo ufw allow $port/tcp"
                else
                    echo "   ✓ Port $port is allowed in firewall"
                fi
            done
            
            if [ "$needs_warning" = true ]; then
                echo ""
                echo "   💡 Tip: If you can't access the server from other devices,"
                echo "      the firewall may be blocking the ports."
                echo "      Run the commands above to allow access."
            fi
        else
            echo "   ℹ️  ufw is not active (no firewall restrictions detected)"
        fi
    elif [ "$os" = "macos" ]; then
        # Check macOS firewall status
        echo ""
        echo "🔒 Firewall Check (macOS):"
        if check_macos_firewall_active; then
            echo "   ℹ️  macOS firewall is enabled"
            echo "   Note: macOS firewall typically allows incoming connections by default"
            echo "   If you can't access the server from other devices, check:"
            echo "   System Settings → Network → Firewall → Options"
            echo "   Make sure 'Block all incoming connections' is NOT enabled"
        else
            echo "   ℹ️  macOS firewall is not enabled (no firewall restrictions detected)"
        fi
    else
        echo ""
        echo "🔒 Firewall Check:"
        echo "   ℹ️  Unable to detect firewall status (OS: $os)"
    fi
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

# In production modes, backend serves static files, so we only need port 33001
# In development mode, we need both ports
if [ "$MODE" = "dev" ]; then
    if check_port 33000; then
        FRONTEND_PORT_IN_USE=true
        PORTS_IN_USE=true
        echo "⚠️  Error: Port 33000 (frontend) is already in use!"
    fi
fi

# Check for PM2 mode specific requirements
if [ "$MODE" = "prod-pm2" ]; then
    if ! command -v pm2 >/dev/null 2>&1; then
        echo "❌ Error: PM2 is not installed!"
        echo ""
        echo "PM2 is required for production PM2 mode (-pm2 flag)."
        echo "Install PM2 by running: npm install -g pm2"
        echo "Or run ./setup.sh which will install PM2 automatically."
        exit 1
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

case "$MODE" in
    "dev")
        echo "Starting Townhall Q&A Poll servers in DEVELOPMENT mode..."
        ;;
    "prod-nohup")
        echo "Starting Townhall Q&A Poll in PRODUCTION mode (nohup)..."
        ;;
    "prod-pm2")
        echo "Starting Townhall Q&A Poll in PRODUCTION mode (PM2)..."
        ;;
esac
echo "Version: $VERSION"
echo ""

# In production modes, build frontend first, then start backend (which serves static files)
# In development mode, start backend first, then frontend dev server
if [ "$MODE" != "dev" ]; then
    echo "Building frontend for production..."
    cd "$SCRIPT_DIR/frontend"
    
    # Load environment variables from .env file if it exists (for build-time vars like VITE_*)
    if [ -f "$SCRIPT_DIR/.env" ]; then
        echo "  Loading environment variables from .env file..."
        set -a
        source "$SCRIPT_DIR/.env"
        set +a
    fi
    
    # Build with environment variables
    npm run build > "$LOG_DIR/frontend-build.log" 2>&1
    if [ $? -ne 0 ]; then
        echo "❌ Error: Frontend build failed! Check $LOG_DIR/frontend-build.log"
        exit 1
    fi
    echo "✓ Frontend built successfully"
    echo ""
fi

# Handle PM2 mode separately
if [ "$MODE" = "prod-pm2" ]; then
    echo "Starting backend server with PM2..."
    cd "$SCRIPT_DIR"
    
    # Start PM2 process
    pm2 start ecosystem.config.js --env production
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to start PM2 process!"
        exit 1
    fi
    
    # Wait a moment and verify backend started successfully
    sleep 3
    if ! check_port 33001; then
        echo "❌ Error: Backend server process started but port 33001 is not listening!"
        echo "   Check PM2 logs with: pm2 logs townhall-backend"
        pm2 stop townhall-backend 2>/dev/null || true
        pm2 delete townhall-backend 2>/dev/null || true
        exit 1
    fi
    
    echo "✓ Backend started successfully with PM2"
    echo ""
    echo "PM2 Status:"
    pm2 list | grep townhall-backend || true
else
    # Start backend server with nohup (dev or prod-nohup mode)
    echo "Starting backend server..."
    cd "$SCRIPT_DIR/backend"
    
    # Set NODE_ENV based on mode
    if [ "$MODE" != "dev" ]; then
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
fi

# Only start frontend server in development mode
# In production modes, backend serves static files, so no separate frontend server needed
if [ "$MODE" = "dev" ]; then
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
case "$MODE" in
    "dev")
        echo "✓ Servers started in background!"
        echo "  Mode: DEVELOPMENT (hot reload enabled)"
        ;;
    "prod-nohup")
        echo "✓ Server started in background!"
        echo "  Mode: PRODUCTION (nohup - single process)"
        ;;
    "prod-pm2")
        echo "✓ Server started with PM2!"
        echo "  Mode: PRODUCTION (PM2 - auto-restart enabled)"
        ;;
esac
echo ""
echo "Access URLs:"
if [ "$MODE" != "dev" ]; then
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

# Check firewall status
check_firewall_status

echo ""
echo "Logs are available in: $LOG_DIR/"
if [ "$MODE" = "prod-pm2" ]; then
    echo "  - PM2 logs: pm2 logs townhall-backend"
    echo "  - PM2 monitor: pm2 monit"
else
    echo "  - Backend:  $LOG_DIR/backend.log"
    if [ "$MODE" != "dev" ]; then
        echo "  - Build:    $LOG_DIR/frontend-build.log"
    else
        echo "  - Frontend: $LOG_DIR/frontend.log"
    fi
fi
echo ""
echo "To stop the servers, run: ./stop-background.sh"
echo "To check status, run: ./status-background.sh"
echo ""
if [ "$MODE" = "dev" ]; then
    echo "To start in production mode:"
    echo "   ./start-background.sh -p      (production with nohup)"
    echo "   ./start-background.sh -pm2    (production with PM2)"
    echo ""
fi
if [ "$MODE" = "prod-pm2" ]; then
    echo "PM2 commands:"
    echo "   pm2 logs townhall-backend    (view logs)"
    echo "   pm2 monit                    (monitor)"
    echo "   pm2 restart townhall-backend (restart)"
    echo ""
    echo "To enable boot startup, run:"
    echo "   pm2 startup"
    echo "   pm2 save"
    echo ""
fi
echo "Note: Processes are running in the background and will continue"
echo "      even if you close this terminal window."
echo ""
