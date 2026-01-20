#!/bin/bash

# Script to run e2e tests
# Usage:
#   ./run-tests.sh              (run tests, check if server is running)
#   ./run-tests.sh --start      (start server, run tests, stop server)
#   ./run-tests.sh --keep       (start server, run tests, keep server running)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Function to wait for server to be ready
wait_for_server() {
    local url=$1
    local max_attempts=30
    local attempt=0
    
    echo -n "Waiting for server to be ready"
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo ""
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo ""
    return 1
}

# Parse arguments
START_SERVER=false
KEEP_SERVER=false

if [[ "$1" == "--start" ]] || [[ "$1" == "-s" ]]; then
    START_SERVER=true
elif [[ "$1" == "--keep" ]] || [[ "$1" == "-k" ]]; then
    START_SERVER=true
    KEEP_SERVER=true
fi

# Check if server is running
SERVER_RUNNING=false
if check_port 33000; then
    SERVER_RUNNING=true
    echo -e "${GREEN}✓${NC} Server is already running on port 33000"
else
    echo -e "${YELLOW}⚠${NC}  Server is not running on port 33000"
    
    if [ "$START_SERVER" = false ]; then
        echo ""
        echo "To start the server and run tests:"
        echo "  ./run-tests.sh --start    (start server, run tests, stop server)"
        echo "  ./run-tests.sh --keep     (start server, run tests, keep server running)"
        echo ""
        echo "Or start the server manually:"
        echo "  ./start-background.sh"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Start server if requested
if [ "$START_SERVER" = true ] && [ "$SERVER_RUNNING" = false ]; then
    echo ""
    echo "Starting server..."
    ./start-background.sh > /dev/null 2>&1
    
    # Wait for server to be ready
    if ! wait_for_server "http://localhost:33000"; then
        echo -e "${RED}❌${NC} Server failed to start or is not responding"
        echo "Check logs in: logs/"
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} Server is ready"
    SERVER_STARTED_BY_SCRIPT=true
else
    SERVER_STARTED_BY_SCRIPT=false
fi

# Run tests
echo ""
echo "Running e2e tests..."
echo ""

npm run test:e2e
TEST_EXIT_CODE=$?

# Stop server if we started it (unless --keep flag is set)
if [ "$SERVER_STARTED_BY_SCRIPT" = true ] && [ "$KEEP_SERVER" = false ]; then
    echo ""
    echo "Stopping server..."
    ./stop-background.sh > /dev/null 2>&1 || true
    echo -e "${GREEN}✓${NC} Server stopped"
fi

# Exit with test exit code
exit $TEST_EXIT_CODE
