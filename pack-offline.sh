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

echo "✓ Package structure created"
echo ""

# Create run-offline.sh script
echo "Creating run-offline.sh script..."
cat > "$PACKAGE_NAME/run-offline.sh" << 'EOFSCRIPT'
#!/bin/bash

# Run script for Townhall Q&A Poll offline deployment
# This script starts the application in production mode

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get version
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
echo "Townhall Q&A Poll - Offline Deployment"
echo "Version: $VERSION"
echo "========================================="
echo ""

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p "$SCRIPT_DIR/backend/data"
mkdir -p "$SCRIPT_DIR/logs"
echo "✓ Directories created"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo ""
    echo "Please install Node.js (v16 or higher) from:"
    echo "  https://nodejs.org/"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "⚠️  Warning: Node.js version is below 16. You have $(node -v)"
    echo "   The application requires Node.js v16 or higher."
    exit 1
fi

echo "✓ Node.js found: $(node -v)"
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
fi

# Set production environment variables
export NODE_ENV=production
export HOST=${HOST:-0.0.0.0}
export PORT=${PORT:-33001}

echo "Starting backend server..."
echo "  NODE_ENV: $NODE_ENV"
echo "  HOST: $HOST"
echo "  PORT: $PORT"
echo ""
echo "Access the application at: http://localhost:$PORT"
if [ "$HOST" = "0.0.0.0" ]; then
    echo "  Or from network: http://<your-ip>:$PORT"
fi
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the backend server (which serves the frontend in production mode)
cd "$SCRIPT_DIR/backend"
node src/server.js
EOFSCRIPT
chmod +x "$PACKAGE_NAME/run-offline.sh"

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

2. Run the application:
   ```bash
   ./run-offline.sh
   ```

3. Access the application:
   - Open browser: `http://localhost:33001`
   - Or from network: `http://<your-ip>:33001`

## Prerequisites

- **Node.js v16 or higher** must be installed on the target machine
- The package includes all dependencies (`node_modules`) - no `npm install` needed
- The package includes pre-built frontend (`frontend/dist`) - no build step needed

## Environment Variables

You can customize the application using environment variables:

```bash
# Port (default: 33001)
PORT=33001 ./run-offline.sh

# Host binding (default: 0.0.0.0 for network access)
HOST=127.0.0.1 ./run-offline.sh  # localhost only

# Combined
PORT=8080 HOST=0.0.0.0 ./run-offline.sh
```

## Database

The SQLite database is automatically created at `backend/data/townhall.db` on first run.

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

- **"Node.js is not installed"**: Install Node.js v16+ from https://nodejs.org/
- **"backend/node_modules not found"**: The package may be corrupted. Re-download from GitHub Releases.
- **Port already in use**: Change the PORT environment variable or stop the process using that port.

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
echo "  1. Transfer the tarball to your target Linux PC"
echo "  2. Extract: tar -xzf $TARBALL_NAME"
echo "  3. Run: cd $PACKAGE_NAME && ./run-offline.sh"
echo ""
echo "Or upload to GitHub Releases for distribution."
echo ""
