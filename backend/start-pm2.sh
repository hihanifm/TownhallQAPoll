#!/bin/bash

# PM2 Wrapper Script for Backend
# Determines whether to run start or start:prod based on NODE_ENV

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ "$NODE_ENV" = "production" ]; then
    echo "Starting backend in PRODUCTION mode..."
    npm run start:prod
else
    echo "Starting backend in DEVELOPMENT mode..."
    npm run start
fi
