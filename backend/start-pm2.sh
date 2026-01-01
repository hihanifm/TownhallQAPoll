#!/bin/bash

# PM2 Wrapper Script for Backend
# Determines whether to run start or start:prod based on NODE_ENV
# Passes through all environment variables

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Ensure environment variables are set (with defaults matching PM2 config)
export NODE_ENV=${NODE_ENV:-development}
export PORT=${PORT:-3001}
export HOST=${HOST:-127.0.0.1}

# Environment variables are set by PM2, so we just use npm start
# Both start and start:prod are identical (rely on env vars from PM2)
if [ "$NODE_ENV" = "production" ]; then
    echo "Starting backend in PRODUCTION mode..."
else
    echo "Starting backend in DEVELOPMENT mode..."
fi
echo "  NODE_ENV=$NODE_ENV"
echo "  PORT=$PORT"
echo "  HOST=$HOST"
npm run start
