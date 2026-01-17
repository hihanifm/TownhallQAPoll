#!/bin/bash

# Setup script for Townhall Q&A Poll Application
# This script checks prerequisites and installs dependencies
# Usage: ./setup.sh

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

# Install backend dependencies
echo "Installing backend dependencies..."
echo "-----------------------------------"
cd "$SCRIPT_DIR/backend"

if [ ! -f "package.json" ]; then
    echo "❌ Error: backend/package.json not found!"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error: Backend installation failed!"
    echo "   Please check the error messages above and try again."
    exit 1
fi

echo ""
echo "✓ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
echo "-----------------------------------"
cd "$SCRIPT_DIR/frontend"

if [ ! -f "package.json" ]; then
    echo "❌ Error: frontend/package.json not found!"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error: Frontend installation failed!"
    echo "   Please check the error messages above and try again."
    exit 1
fi

echo ""
echo "✓ Frontend dependencies installed"
echo ""

# Return to script directory
cd "$SCRIPT_DIR"

echo "========================================="
echo "✓ Setup Complete!"
echo "========================================="
echo ""

# Check for security vulnerabilities
echo "Checking for security vulnerabilities..."
if npm audit --prefix backend --audit-level=high >/dev/null 2>&1; then
    echo "✓ No high severity vulnerabilities found in backend"
else
    echo "⚠️  Some security vulnerabilities found in backend"
    echo "   Run 'npm audit fix' in backend/ directory to address them"
fi

if npm audit --prefix frontend --audit-level=high >/dev/null 2>&1; then
    echo "✓ No high severity vulnerabilities found in frontend"
else
    echo "⚠️  Some security vulnerabilities found in frontend"
    echo "   Run 'npm audit fix' in frontend/ directory to address them"
fi

echo ""

# Display next steps
echo "Next Steps:"
echo "-----------"
echo ""
echo "1. Start the backend server:"
echo "   npm run start:backend"
echo "   (or use: ./start-background.sh for background mode)"
echo ""
echo "2. Start the frontend server (in another terminal):"
echo "   npm run start:frontend"
echo "   (or use: ./start-background.sh to start both in background)"
echo ""
echo "3. Open your browser and navigate to:"
echo "   http://localhost:33000"
echo ""
echo "For more information, see README.md"
echo ""
echo "To run both servers in the background:"
echo "   ./start-background.sh          (development mode)"
echo "   ./start-background.sh --prod   (production mode)"
echo ""
echo "To check server status:"
echo "   ./status-background.sh"
echo ""
echo "To stop background servers:"
echo "   ./stop-background.sh"
echo ""
