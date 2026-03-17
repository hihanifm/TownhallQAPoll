#!/bin/bash

# Load canonical frontend/backend ports from config/ports.json.
# Environment variables can still override:
# - FRONTEND_PORT for frontend
# - PORT or BACKEND_PORT for backend
load_port_config() {
    local script_dir="$1"
    local ports_file="$script_dir/config/ports.json"
    local default_frontend=33100
    local default_backend=33101
    local parsed_frontend=""
    local parsed_backend=""

    if [ -f "$ports_file" ] && command -v node >/dev/null 2>&1; then
        parsed_frontend=$(node -p "const cfg = require(process.argv[1]); Number(cfg.frontend) || ''" "$ports_file" 2>/dev/null || true)
        parsed_backend=$(node -p "const cfg = require(process.argv[1]); Number(cfg.backend) || ''" "$ports_file" 2>/dev/null || true)
    fi

    if [ -n "$parsed_frontend" ]; then
        default_frontend="$parsed_frontend"
    fi
    if [ -n "$parsed_backend" ]; then
        default_backend="$parsed_backend"
    fi

    FRONTEND_PORT="${FRONTEND_PORT:-$default_frontend}"
    BACKEND_PORT="${BACKEND_PORT:-${PORT:-$default_backend}}"
    PORT="${PORT:-$BACKEND_PORT}"

    export FRONTEND_PORT
    export BACKEND_PORT
    export PORT
}
