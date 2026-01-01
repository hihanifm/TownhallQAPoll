#!/bin/bash

# PM2 Monitoring Script for Townhall Q&A Poll
# Checks for continuous crashes and alerts

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "PM2 Status Check"
echo "=========================================="
echo ""

# Check PM2 status
pm2 status

echo ""
echo "=========================================="
echo "Checking for Crashed/Errored Apps"
echo "=========================================="
echo ""

# Check for errored apps
ERRORED_APPS=$(pm2 jlist | grep -o '"pm2_env":{"status":"errored"' | wc -l | tr -d ' ')

if [ "$ERRORED_APPS" -gt 0 ]; then
    echo "⚠️  WARNING: Found $ERRORED_APPS app(s) in ERRORED state!"
    echo ""
    echo "This means the app crashed more than 5 times (within 60 seconds each) and PM2 stopped trying to restart it."
    echo ""
    echo "To investigate:"
    echo "  1. Check error logs: pm2 logs --err"
    echo "  2. Check specific app: pm2 logs townhall-backend --err"
    echo "  3. View detailed info: pm2 describe townhall-backend"
    echo ""
    echo "To manually restart after fixing the issue:"
    echo "  pm2 restart townhall-backend"
    echo "  pm2 restart townhall-frontend"
    echo ""
else
    echo "✓ All apps are running normally"
fi

echo ""
echo "=========================================="
echo "Recent Restarts (last 5 minutes)"
echo "=========================================="
echo ""

# Show restart count in last 5 minutes
pm2 list | grep -E "restart|errored|stopped" || echo "No recent restarts detected"

echo ""
echo "=========================================="
echo "Memory Usage"
echo "=========================================="
echo ""

pm2 list | grep -E "name|memory|cpu"

echo ""
echo "=========================================="
echo "Log Locations"
echo "=========================================="
echo ""
echo "Error logs:"
echo "  Backend:  $SCRIPT_DIR/logs/pm2-backend-error.log"
echo "  Frontend: $SCRIPT_DIR/logs/pm2-frontend-error.log"
echo ""
echo "View logs:"
echo "  pm2 logs townhall-backend --err"
echo "  pm2 logs townhall-frontend --err"
echo "  pm2 logs  # All logs"
echo ""
