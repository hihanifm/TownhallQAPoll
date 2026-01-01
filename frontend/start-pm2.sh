#!/bin/bash

# PM2 Wrapper Script for Frontend
# Determines whether to run dev or preview based on NODE_ENV
# Passes through all Vite environment variables

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Ensure environment variables are set (with defaults matching PM2 config)
export NODE_ENV=${NODE_ENV:-development}
export PORT=${PORT:-3000}
export VITE_USE_PROXY=${VITE_USE_PROXY:-true}
export VITE_API_URL=${VITE_API_URL:-http://localhost:3001}

if [ "$NODE_ENV" = "production" ]; then
    echo "Starting frontend in PRODUCTION mode (preview)..."
    echo "  PORT=$PORT"
    echo "  VITE_USE_PROXY=$VITE_USE_PROXY"
    echo "  VITE_API_URL=$VITE_API_URL"
    npm run preview
else
    echo "Starting frontend in DEVELOPMENT mode (dev server)..."
    echo "  PORT=$PORT"
    echo "  VITE_USE_PROXY=$VITE_USE_PROXY"
    echo "  VITE_API_URL=$VITE_API_URL"
    npm run dev
fi
