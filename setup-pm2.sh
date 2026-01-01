#!/bin/bash

# PM2 Setup Script for Townhall Q&A Poll
# This script helps set up PM2 for production deployment with auto-start on boot

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

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

# Build frontend
echo "Building frontend for production..."
cd "$SCRIPT_DIR/frontend"
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✓ Frontend built successfully"

cd "$SCRIPT_DIR"

echo ""

# Stop existing PM2 processes if any
echo "Stopping any existing PM2 processes..."
pm2 delete ecosystem.config.js 2>/dev/null || true
echo "✓ Cleaned up existing processes"

echo ""

# Start PM2 with ecosystem config
echo "Starting applications with PM2..."
pm2 start ecosystem.config.js --env production

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
