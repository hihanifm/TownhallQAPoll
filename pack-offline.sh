#!/bin/bash

# Pack script for creating offline deployment package
# This script creates a tarball with all dependencies pre-installed
# Usage: ./pack-offline.sh

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

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
PACKAGE_NAME="townhall-qa-poll-${VERSION}-offline"
TARBALL_NAME="${PACKAGE_NAME}.tar.gz"

echo "========================================="
echo "Townhall Q&A Poll - Offline Package Builder"
echo "Version: $VERSION"
echo "========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed!"
    exit 1
fi

echo "✓ Node.js found: $(node -v)"
echo "✓ npm found: $(npm -v)"
echo ""

# Warn about platform
echo "⚠️  Platform Check:"
echo "  Current OS: $(uname -s)"
echo "  Current Arch: $(uname -m)"
echo ""
echo "  Important: This package is built for $(uname -s) $(uname -m)"
echo "  The target machine must match this platform (especially for native modules like sqlite3)."
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
if [ ! -d "node_modules" ]; then
    npm ci
else
    echo "  node_modules already exists, skipping..."
fi
echo "✓ Backend dependencies ready"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm ci
else
    echo "  node_modules already exists, skipping..."
fi
echo "✓ Frontend dependencies ready"
echo ""

# Build frontend
echo "Building frontend..."
cd "$SCRIPT_DIR/frontend"
npm run build
echo "✓ Frontend built"
echo ""

# Create package directory
echo "Creating package structure..."
cd "$SCRIPT_DIR"
rm -rf "$PACKAGE_NAME"
mkdir -p "$PACKAGE_NAME/backend" "$PACKAGE_NAME/frontend"

# Copy backend (excluding unnecessary files)
echo "  Copying backend..."
cp -r backend/src "$PACKAGE_NAME/backend/"
cp -r backend/node_modules "$PACKAGE_NAME/backend/"
cp backend/package.json "$PACKAGE_NAME/backend/"
cp backend/package-lock.json "$PACKAGE_NAME/backend/" 2>/dev/null || true
mkdir -p "$PACKAGE_NAME/backend/data"

# Copy frontend dist (pre-built)
echo "  Copying frontend..."
cp -r frontend/dist "$PACKAGE_NAME/frontend/" 2>/dev/null || true
cp frontend/package.json "$PACKAGE_NAME/frontend/" 2>/dev/null || true

# Copy root files
cp README.md "$PACKAGE_NAME/" 2>/dev/null || true
cp VERSION "$PACKAGE_NAME/" 2>/dev/null || true
cp ecosystem.config.js "$PACKAGE_NAME/" 2>/dev/null || true

echo "✓ Package structure created"
echo ""

# Create setup.sh script
echo "Creating setup.sh script..."
cat > "$PACKAGE_NAME/setup.sh" << 'EOFSCRIPT'
#!/bin/bash

# Setup script for Townhall Q&A Poll offline deployment
# This script checks prerequisites and prepares the environment
# Usage: ./setup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

echo "========================================="
echo "Townhall Q&A Poll - Setup Script"
echo "Version: $VERSION"
echo "========================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
echo "Checking prerequisites..."
echo ""

if ! command_exists node; then
    echo "❌ Error: Node.js is not installed!"
    echo ""
    echo "Please install Node.js (v16 or higher) from:"
    echo "  https://nodejs.org/"
    echo ""
    echo "After installing Node.js, run this script again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "⚠️  Warning: Node.js version is below 16. You have $(node -v)"
    echo "   The application requires Node.js v16 or higher."
    echo "   Please upgrade Node.js from: https://nodejs.org/"
    echo ""
    read -p "Continue anyway? (not recommended) (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Please upgrade Node.js first."
        exit 1
    fi
fi

echo "✓ Node.js found: $(node -v)"
echo "✓ npm found: $(npm -v)"
echo ""

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p "$SCRIPT_DIR/logs"
mkdir -p "$SCRIPT_DIR/backend/data"
echo "✓ Directories created"
echo ""

# Check if backend node_modules exist
if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
    echo "❌ Error: backend/node_modules not found!"
    echo "   The offline package should include pre-installed dependencies."
    echo "   Please ensure the package was built correctly."
    exit 1
fi

# Check if frontend dist exists
if [ ! -d "$SCRIPT_DIR/frontend/dist" ]; then
    echo "⚠️  Warning: frontend/dist not found!"
    echo "   The application will start, but frontend may not work correctly."
    echo ""
fi

# Rebuild native modules for current platform (important for cross-platform compatibility)
echo "Rebuilding native modules for current platform..."
echo "  (This ensures compatibility with your OS/architecture)"
cd "$SCRIPT_DIR/backend"

NATIVE_MODULE_ERROR=false

if [ -d "node_modules/sqlite3" ]; then
    echo "  Rebuilding sqlite3..."
    
    # Try rebuild first (suppress output but capture errors)
    if npm rebuild sqlite3 >/tmp/sqlite3-rebuild.log 2>&1; then
        echo "  ✓ sqlite3 rebuilt successfully"
    else
        echo "  ⚠️  Rebuild failed, trying to install from source..."
        # If rebuild fails, try installing from source
        if npm install sqlite3 --build-from-source >/tmp/sqlite3-install.log 2>&1; then
            echo "  ✓ sqlite3 installed from source successfully"
        else
            NATIVE_MODULE_ERROR=true
            echo ""
            echo "❌ Error: Failed to rebuild sqlite3 for your platform!"
            echo ""
            echo "Build errors:"
            tail -n 10 /tmp/sqlite3-rebuild.log 2>/dev/null | sed 's/^/    /'
            tail -n 10 /tmp/sqlite3-install.log 2>/dev/null | sed 's/^/    /'
            echo ""
            echo "The application requires sqlite3 to work, but it cannot be built for your system."
            echo ""
            echo "Possible causes:"
            echo "  - Missing build tools (gcc, make, python, etc.)"
            echo "  - Incompatible Node.js version"
            echo "  - Platform architecture mismatch"
            echo ""
            echo "To fix this:"
            echo "  1. Install build tools:"
            echo "     - Linux: sudo apt-get install build-essential python3"
            echo "     - macOS: xcode-select --install"
            echo ""
            echo "  2. Try manually:"
            echo "     cd backend"
            echo "     npm install sqlite3 --build-from-source"
            echo ""
        fi
    fi
    
    # Verify sqlite3 module can be loaded (only if rebuild/install succeeded)
    if [ "$NATIVE_MODULE_ERROR" = false ]; then
        echo "  Verifying sqlite3 module..."
        if node -e "require('sqlite3')" >/dev/null 2>&1; then
            echo "  ✓ sqlite3 module verified"
        else
            NATIVE_MODULE_ERROR=true
            echo ""
            echo "❌ Error: sqlite3 module cannot be loaded!"
            echo ""
            echo "The module was rebuilt but cannot be imported. This usually means:"
            echo "  - Architecture mismatch (e.g., x86 vs ARM, or different OS)"
            echo "  - Node.js version incompatibility"
            echo ""
            echo "Try:"
            echo "  cd backend"
            echo "  npm install sqlite3 --build-from-source"
            echo ""
        fi
    fi
else
    echo "  ⚠️  sqlite3 not found in node_modules"
    echo "  Installing sqlite3..."
    if npm install sqlite3 >/tmp/sqlite3-install.log 2>&1; then
        echo "  ✓ sqlite3 installed"
        # Verify it can be loaded
        if ! node -e "require('sqlite3')" >/dev/null 2>&1; then
            NATIVE_MODULE_ERROR=true
            echo ""
            echo "❌ Error: sqlite3 module cannot be loaded after installation!"
            echo ""
        fi
    else
        NATIVE_MODULE_ERROR=true
        echo ""
        echo "❌ Error: Failed to install sqlite3!"
        echo ""
        echo "Install errors:"
        tail -n 10 /tmp/sqlite3-install.log 2>/dev/null | sed 's/^/    /'
        echo ""
        echo "Try manually:"
        echo "  cd backend"
        echo "  npm install sqlite3 --build-from-source"
        echo ""
    fi
fi

# Clean up temp files
rm -f /tmp/sqlite3-rebuild.log /tmp/sqlite3-install.log 2>/dev/null

# Exit if native module setup failed
if [ "$NATIVE_MODULE_ERROR" = true ]; then
    cd "$SCRIPT_DIR"
    exit 1
fi

echo "✓ Native modules ready"
echo ""

# Check for PM2 (optional - only needed for production PM2 mode)
echo "Checking for PM2 (optional - needed for production PM2 mode)..."
if ! command_exists pm2; then
    echo "PM2 not found. Installing PM2 globally..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "⚠️  Warning: PM2 installation failed!"
        echo "   You can install it manually later with: npm install -g pm2"
        echo "   PM2 is only needed if you plan to use production PM2 mode (./start.sh -pm2)"
    else
        echo "✓ PM2 installed successfully"
    fi
else
    echo "✓ PM2 found: $(pm2 --version 2>/dev/null || echo 'installed')"
fi
echo ""

# Return to script directory
cd "$SCRIPT_DIR"

echo "========================================="
echo "✓ Setup Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "-----------"
echo ""
echo "1. Start the application:"
echo "   ./start.sh          (production mode - nohup)"
echo "   ./start.sh -pm2     (production mode - PM2 with auto-restart)"
echo ""
echo "2. Check status:"
echo "   ./status.sh"
echo ""
echo "3. Stop the application:"
echo "   ./stop.sh"
echo ""
echo "4. Access the application:"
echo "   http://localhost:33001"
echo ""
EOFSCRIPT
chmod +x "$PACKAGE_NAME/setup.sh"

# Create start.sh script
echo "Creating start.sh script..."
cat > "$PACKAGE_NAME/start.sh" << 'EOFSCRIPT'
#!/bin/bash

# Script to start the application in production mode
# Usage: 
#   ./start.sh           (production mode - nohup)
#   ./start.sh -pm2      (production mode - PM2 with auto-restart)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}")" && pwd )"
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
MODE="prod-nohup"
if [[ "$1" == "--pm2" ]] || [[ "$1" == "-pm2" ]]; then
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

if check_port 33001; then
    PORTS_IN_USE=true
    echo "⚠️  Error: Port 33001 (backend) is already in use!"
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
    echo "❌ Cannot start server - port is already in use or server is running!"
    echo "   Run ./stop.sh to stop existing server first."
    echo "   Or check status with: ./status.sh"
    echo ""
    read -p "Force start anyway? (not recommended) (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please stop existing server first."
        exit 1
    fi
    echo "⚠️  Warning: Forcing start - this may cause conflicts!"
fi

case "$MODE" in
    "prod-nohup")
        echo "Starting Townhall Q&A Poll in PRODUCTION mode (nohup)..."
        ;;
    "prod-pm2")
        echo "Starting Townhall Q&A Poll in PRODUCTION mode (PM2)..."
        ;;
esac
echo "Version: $VERSION"
echo ""

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
    # Start backend server with nohup (prod-nohup mode)
    echo "Starting backend server..."
    cd "$SCRIPT_DIR/backend"
    
    export NODE_ENV=production
    export HOST=0.0.0.0
    echo "  Setting NODE_ENV=production"
    echo "  Setting HOST=0.0.0.0 (accessible from network)"
    
    nohup env NODE_ENV=$NODE_ENV HOST=${HOST:-0.0.0.0} npm start > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    disown $BACKEND_PID 2>/dev/null || true
    
    # Wait a moment and verify backend started successfully
    sleep 3
    if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "❌ Error: Backend server failed to start! Check $LOG_DIR/backend.log"
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

# Get local IP address
LOCAL_IP=$(get_local_ip)

echo ""
case "$MODE" in
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
echo "  Application:"
echo "    - Local:  http://localhost:33001"
if [ -n "$LOCAL_IP" ]; then
    echo "    - Network: http://$LOCAL_IP:33001"
fi
echo "    (Backend serves both API and frontend)"
echo ""
echo "Logs are available in: $LOG_DIR/"
if [ "$MODE" = "prod-pm2" ]; then
    echo "  - PM2 logs: pm2 logs townhall-backend"
    echo "  - PM2 monitor: pm2 monit"
else
    echo "  - Backend:  $LOG_DIR/backend.log"
fi
echo ""
echo "To stop the server, run: ./stop.sh"
echo "To check status, run: ./status.sh"
echo ""
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
echo "Note: Process is running in the background and will continue"
echo "      even if you close this terminal window."
echo ""
EOFSCRIPT
chmod +x "$PACKAGE_NAME/start.sh"

# Create stop.sh script
echo "Creating stop.sh script..."
cat > "$PACKAGE_NAME/stop.sh" << 'EOFSCRIPT'
#!/bin/bash

# Script to stop the server
# LINUX/macOS ONLY

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}")" && pwd )"
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

echo "Stopping Townhall Q&A Poll server..."
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

# Otherwise, handle nohup processes (prod-nohup mode)
if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Server may not be running."
    echo "Checking for running processes..."
    
    # Try to find and kill by port
    BACKEND_PID=$(lsof -ti:33001 2>/dev/null)
    
    if [ -z "$BACKEND_PID" ]; then
        echo "No server found running on port 33001."
        exit 0
    fi
else
    # Read PID from file
    BACKEND_PID=$(head -n 1 "$PID_FILE" 2>/dev/null)
fi

echo "Detected nohup process (production nohup mode)"
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

# Clean up any remaining processes on the port
BACKEND_PORT_PID=$(lsof -ti:33001 2>/dev/null)

if [ -n "$BACKEND_PORT_PID" ]; then
    echo "Killing process on port 33001 (PID: $BACKEND_PORT_PID)..."
    kill -9 $BACKEND_PORT_PID 2>/dev/null
fi

# Remove PID file
if [ -f "$PID_FILE" ]; then
    rm "$PID_FILE"
    echo "✓ PID file removed"
fi

echo ""
echo "All servers stopped."
EOFSCRIPT
chmod +x "$PACKAGE_NAME/stop.sh"

# Create status.sh script
echo "Creating status.sh script..."
cat > "$PACKAGE_NAME/status.sh" << 'EOFSCRIPT'
#!/bin/bash

# Script to check the status of the server
# LINUX/macOS ONLY

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}")" && pwd )"
PID_FILE="$SCRIPT_DIR/server.pids"
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

# Check if PM2 process is running
PM2_RUNNING=false
if command -v pm2 >/dev/null 2>&1; then
    if pm2 list 2>/dev/null | grep -q "townhall-backend"; then
        PM2_RUNNING=true
    fi
fi

# If PM2 process is running, show PM2 status
if [ "$PM2_RUNNING" = true ]; then
    echo "Mode: PRODUCTION (PM2)"
    echo ""
    echo "PM2 Status:"
    pm2 list | head -n 5
    echo ""
    pm2 describe townhall-backend 2>/dev/null | grep -E "(status|uptime|restarts|memory|cpu|pid)" || true
    echo ""
    echo "PM2 Logs location: ~/.pm2/logs/"
    echo "  - View logs: pm2 logs townhall-backend"
    echo "  - Monitor: pm2 monit"
    echo ""
    LOCAL_IP=$(get_local_ip)
    if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Access URLs:"
        echo "  Application:"
        echo "    - Local:  http://localhost:33001"
        if [ -n "$LOCAL_IP" ]; then
            echo "    - Network: http://$LOCAL_IP:33001"
        fi
        echo ""
    fi
    exit 0
fi

# Otherwise, show nohup status (prod-nohup mode)
MODE="UNKNOWN"
if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    MODE="PRODUCTION (nohup)"
fi

if [ "$MODE" != "UNKNOWN" ]; then
    echo "Mode: $MODE"
    echo ""
fi

# Check PID file
if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Server may not be running via start.sh"
    echo ""
else
    echo "From PID file:"
    BACKEND_PID=$(head -n 1 "$PID_FILE" 2>/dev/null)
    if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "  Backend (PID $BACKEND_PID):  ✓ Running"
    else
        echo "  Backend (PID $BACKEND_PID):  ✗ Not running"
    fi
    echo ""
fi

# Check by port
echo "Port status:"
if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:33001)
    echo "  Port 33001 (backend):  ✓ In use (PID: $PORT_PID)"
else
    echo "  Port 33001 (backend):  ✗ Not in use"
fi

echo ""

# Show access URLs
LOCAL_IP=$(get_local_ip)
if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Access URLs:"
    echo "  Application:"
    echo "    - Local:  http://localhost:33001"
    if [ -n "$LOCAL_IP" ]; then
        echo "    - Network: http://$LOCAL_IP:33001"
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
    echo ""
    echo "To view logs:"
    echo "  tail -f $LOG_DIR/backend.log"
    echo ""
fi

echo ""
EOFSCRIPT
chmod +x "$PACKAGE_NAME/status.sh"

# Create DEPLOYMENT.md
echo "Creating DEPLOYMENT.md..."
cat > "$PACKAGE_NAME/DEPLOYMENT.md" << 'EOFMARKDOWN'
# Offline Deployment Guide

## Quick Start

1. Extract the tarball:
   ```bash
   tar -xzf townhall-qa-poll-*-offline.tar.gz
   cd townhall-qa-poll-*-offline
   ```

2. Run setup (checks prerequisites and prepares environment):
   ```bash
   ./setup.sh
   ```

3. Start the application:
   ```bash
   ./start.sh          # Production mode (nohup)
   ./start.sh -pm2     # Production mode (PM2 with auto-restart)
   ```

4. Access the application:
   - Open browser: `http://localhost:33001`
   - Or from network: `http://<your-ip>:33001`

## Available Scripts

- **`./setup.sh`** - Check prerequisites, create directories, rebuild native modules
- **`./start.sh`** - Start in production mode (nohup)
- **`./start.sh -pm2`** - Start in production mode with PM2 (auto-restart)
- **`./stop.sh`** - Stop the server
- **`./status.sh`** - Check server status

## Prerequisites

- **Node.js v16 or higher** must be installed on the target machine
- The package includes all dependencies (`node_modules`) - no `npm install` needed
- The package includes pre-built frontend (`frontend/dist`) - no build step needed
- **PM2** (optional) - Only needed if using `./start.sh -pm2`. Install with: `npm install -g pm2`

## Setup Script

The `setup.sh` script will:
- ✓ Check Node.js version
- ✓ Create necessary directories (`logs/`, `backend/data/`)
- ✓ Rebuild native modules (like sqlite3) for your platform
- ✓ Install PM2 (if not already installed) for PM2 mode

**Important**: If you're running on a different platform than the build machine (e.g., package built on Linux but running on macOS), the setup script will rebuild native modules automatically.

## Starting the Server

### Production Mode (nohup)
```bash
./start.sh
```
- Runs in background
- Single process
- Logs to `logs/backend.log`
- Stops when you run `./stop.sh`

### Production Mode (PM2)
```bash
./start.sh -pm2
```
- Runs with PM2 process manager
- Auto-restart on crash
- Memory limit monitoring
- Better for production deployments
- View logs: `pm2 logs townhall-backend`
- Monitor: `pm2 monit`

## Environment Variables

You can customize the application using environment variables:

```bash
# Port (default: 33001)
PORT=33001 ./start.sh

# Host binding (default: 0.0.0.0 for network access)
HOST=127.0.0.1 ./start.sh  # localhost only

# Combined
PORT=8080 HOST=0.0.0.0 ./start.sh
```

## Database

The SQLite database is automatically created at `backend/data/townhall.db` on first run.

## Checking Status

```bash
./status.sh
```

Shows:
- Server mode (nohup or PM2)
- Process status
- Port status
- Access URLs
- Log file locations

## Stopping the Server

```bash
./stop.sh
```

This will:
- Stop PM2 process (if using PM2 mode)
- Stop nohup process (if using nohup mode)
- Clean up PID files
- Kill any processes on port 33001

## Troubleshooting

- **"Node.js is not installed"**: Install Node.js v16+ from https://nodejs.org/
- **"backend/node_modules not found"**: The package may be corrupted. Re-download from GitHub Releases.
- **"sqlite3 module error"**: Run `./setup.sh` to rebuild native modules for your platform.
- **Port already in use**: Run `./stop.sh` first, or change the PORT environment variable.
- **PM2 not found**: Install with `npm install -g pm2` or run `./setup.sh` which will install it.

## Platform Compatibility

**Important**: Native modules (like sqlite3) are compiled for a specific platform. If you're running on a different platform than the build machine:

1. Run `./setup.sh` - it will automatically rebuild native modules
2. Or manually: `cd backend && npm rebuild sqlite3`

## Support

For more information, see the main README.md or the project repository.
EOFMARKDOWN

echo "✓ Scripts and documentation created"
echo ""

# Create tarball
echo "Creating tarball..."
tar -czf "$TARBALL_NAME" "$PACKAGE_NAME"

# Display results
TARBALL_SIZE=$(du -h "$TARBALL_NAME" | cut -f1)
echo ""
echo "========================================="
echo "✓ Package created successfully!"
echo "========================================="
echo ""
echo "Package: $TARBALL_NAME"
echo "Size: $TARBALL_SIZE"
echo ""
echo "Next steps:"
echo "  1. Transfer the tarball to your target machine"
echo "  2. Extract: tar -xzf $TARBALL_NAME"
echo "  3. Run setup: cd $PACKAGE_NAME && ./setup.sh"
echo "  4. Start server: ./start.sh (or ./start.sh -pm2 for PM2 mode)"
echo ""
echo "Available scripts:"
echo "  ./setup.sh      - Check prerequisites and prepare environment"
echo "  ./start.sh      - Start in production mode (nohup)"
echo "  ./start.sh -pm2 - Start in production mode (PM2)"
echo "  ./stop.sh       - Stop the server"
echo "  ./status.sh     - Check server status"
echo ""
echo "Or upload to GitHub Releases for distribution."
echo ""
