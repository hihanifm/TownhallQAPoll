#!/bin/bash

# PM2 Wrapper Script for Frontend
# Determines whether to run dev or preview based on NODE_ENV

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ "$NODE_ENV" = "production" ]; then
    echo "Starting frontend in PRODUCTION mode (preview)..."
    npm run preview
else
    echo "Starting frontend in DEVELOPMENT mode (dev server)..."
    npm run dev
fi
