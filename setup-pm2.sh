#!/bin/bash

# PM2 Setup Script for Townhall Q&A Poll
# This script helps set up PM2 with auto-start on boot
# Usage: ./setup-pm2.sh [--prod|--production] [--vite-proxy|-vp]
#   --prod, --production: Start in production mode (builds frontend first, default: no proxy)
#   --vite-proxy, -vp: Enable Vite proxy in production mode (only valid with --prod)
#   (no args): Start in development mode (default)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Parse command line arguments
PROD_MODE=false
VITE_PROXY=false

for arg in "$@"; do
    case $arg in
        --prod|--production)
            PROD_MODE=true
            ;;
        --vite-proxy|-vp)
            VITE_PROXY=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: ./setup-pm2.sh [--prod|--production] [--vite-proxy|-vp]"
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
    echo "  ./setup-pm2.sh --prod --vite-proxy"
    echo "  or: ./setup-pm2.sh --production -vp"
    echo ""
    exit 1
fi

echo "=========================================="
echo "PM2 Setup for Townhall Q&A Poll"
echo "=========================================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed!"
    echo ""
    echo "Installing PM2 globally..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install PM2. Please install it manually:"
        echo "   npm install -g pm2"
        exit 1
    fi
    echo "✓ PM2 installed successfully"
else
    echo "✓ PM2 is already installed"
    pm2 --version
fi

echo ""

# Create logs directory
echo "Creating logs directory..."
mkdir -p "$SCRIPT_DIR/logs"
echo "✓ Logs directory ready"

echo ""

# Build frontend if production mode
if [ "$PROD_MODE" = true ]; then
    # Set build environment variables based on proxy setting
    if [ "$VITE_PROXY" = true ]; then
        echo "Building frontend for production (with Vite proxy)..."
        BUILD_VITE_USE_PROXY=true
    else
        echo "Building frontend for production (no proxy, direct backend calls)..."
        BUILD_VITE_USE_PROXY=false
    fi
    cd "$SCRIPT_DIR/frontend"
    VITE_USE_PROXY=$BUILD_VITE_USE_PROXY VITE_API_URL=http://localhost:3001 npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Frontend build failed!"
        exit 1
    fi
    echo "✓ Frontend built successfully"
    cd "$SCRIPT_DIR"
    echo ""
fi

# Stop existing PM2 processes if any
echo "Stopping any existing PM2 processes..."
pm2 delete ecosystem.config.js 2>/dev/null || true
echo "✓ Cleaned up existing processes"

echo ""

# Start PM2 with ecosystem config
if [ "$PROD_MODE" = true ]; then
    if [ "$VITE_PROXY" = true ]; then
        echo "Starting applications with PM2 in PRODUCTION mode (with Vite proxy)..."
        pm2 start ecosystem.config.js --env production_proxy
    else
        echo "Starting applications with PM2 in PRODUCTION mode (no proxy, direct backend calls)..."
        pm2 start ecosystem.config.js --env production
    fi
else
    echo "Starting applications with PM2 in DEVELOPMENT mode..."
    pm2 start ecosystem.config.js --env development
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to start PM2 processes!"
    exit 1
fi

echo ""
echo "✓ Applications started with PM2"
echo ""

# Show status
pm2 status

echo ""
echo "Saving PM2 process list..."
pm2 save

echo ""
echo "=========================================="
echo "Setting up PM2 to start on system boot..."
echo "=========================================="
echo ""
echo "PM2 will generate a startup script. Follow these steps:"
echo ""
echo "1. PM2 will output a command like:"
echo "   sudo env PATH=... pm2 startup systemd -u YOUR_USER --hp /home/YOUR_USER"
echo ""
echo "2. Copy and run that command (it requires sudo)"
echo ""
echo "3. After running the startup command, run:"
echo "   pm2 save"
echo ""
echo "This will ensure PM2 starts your applications on system boot."
echo ""
read -p "Do you want to generate the startup command now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Generating startup command..."
    echo ""
    pm2 startup
    echo ""
    echo "⚠️  IMPORTANT: Copy and run the command shown above with sudo!"
    echo "   After running it, execute: pm2 save"
    echo ""
fi

echo ""
echo "=========================================="
echo "PM2 Setup Complete!"
echo "=========================================="
echo ""
if [ "$PROD_MODE" = true ]; then
    echo "Mode: PRODUCTION"
    echo "  - Frontend: Built and served via 'vite preview'"
    echo "  - Backend: NODE_ENV=production"
    if [ "$VITE_PROXY" = true ]; then
        echo "  - API: Vite proxy enabled"
    else
        echo "  - API: Direct backend calls (no Vite proxy - default)"
    fi
else
    echo "Mode: DEVELOPMENT"
    echo "  - Frontend: Vite dev server with hot reload"
    echo "  - Backend: NODE_ENV=development"
    echo "  - API: Vite proxy enabled (required for development)"
fi
echo ""
echo "Useful PM2 commands:"
echo "  npm run pm2:status    - Check application status"
echo "  npm run pm2:logs      - View application logs"
echo "  npm run pm2:restart   - Restart applications"
echo "  npm run pm2:stop      - Stop applications"
echo "  npm run pm2:delete    - Remove applications from PM2"
echo ""
echo "Logs are available in: $SCRIPT_DIR/logs/"
echo "  - pm2-backend.log"
echo "  - pm2-frontend.log"
echo ""
