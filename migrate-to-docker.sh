#!/bin/bash

# Migration script from PM2 to Docker
# This script safely migrates the database and stops PM2 service

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Townhall Q&A Poll - Docker Migration"
echo "========================================="
echo ""

# Check if running as root for directory creation
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠${NC}  This script needs sudo privileges to create system directories"
    echo "   You'll be prompted for your password"
    echo ""
fi

# Define safe directories
DATA_DIR="/var/lib/townhall/data"
LOG_DIR="/var/log/townhall"
OLD_DATA_DIR="$SCRIPT_DIR/backend/data"

echo "Step 1: Creating safe directories..."
echo ""

# Create data directory
if [ ! -d "$DATA_DIR" ]; then
    echo "Creating $DATA_DIR..."
    sudo mkdir -p "$DATA_DIR"
    sudo chmod 755 "$DATA_DIR"
    echo -e "${GREEN}✓${NC} Created $DATA_DIR"
else
    echo -e "${GREEN}✓${NC} $DATA_DIR already exists"
fi

# Create backups subdirectory
if [ ! -d "$DATA_DIR/backups" ]; then
    echo "Creating $DATA_DIR/backups..."
    sudo mkdir -p "$DATA_DIR/backups"
    sudo chmod 755 "$DATA_DIR/backups"
    echo -e "${GREEN}✓${NC} Created $DATA_DIR/backups"
else
    echo -e "${GREEN}✓${NC} $DATA_DIR/backups already exists"
fi

# Create log directory
if [ ! -d "$LOG_DIR" ]; then
    echo "Creating $LOG_DIR..."
    sudo mkdir -p "$LOG_DIR"
    sudo chmod 755 "$LOG_DIR"
    echo -e "${GREEN}✓${NC} Created $LOG_DIR"
else
    echo -e "${GREEN}✓${NC} $LOG_DIR already exists"
fi

# Get current user (for Docker)
CURRENT_USER=${SUDO_USER:-$USER}
if [ -z "$CURRENT_USER" ] || [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER=$(whoami)
fi

echo ""
echo "Step 2: Setting directory ownership..."
echo "Setting ownership to $CURRENT_USER for Docker access..."
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$DATA_DIR"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$LOG_DIR"
echo -e "${GREEN}✓${NC} Ownership set"

echo ""
echo "Step 3: Migrating database..."
echo ""

# Check if old database exists
if [ -f "$OLD_DATA_DIR/townhall.db" ]; then
    echo "Found existing database at $OLD_DATA_DIR/townhall.db"
    
    # Check if new location already has a database
    if [ -f "$DATA_DIR/townhall.db" ]; then
        echo -e "${YELLOW}⚠${NC}  Database already exists at $DATA_DIR/townhall.db"
        read -p "Overwrite existing database? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Backing up existing database..."
            sudo cp "$DATA_DIR/townhall.db" "$DATA_DIR/townhall.db.backup.$(date +%Y%m%d_%H%M%S)"
            echo "Copying database..."
            sudo cp "$OLD_DATA_DIR/townhall.db" "$DATA_DIR/townhall.db"
            sudo chown "$CURRENT_USER:$CURRENT_USER" "$DATA_DIR/townhall.db"
            echo -e "${GREEN}✓${NC} Database migrated"
        else
            echo "Skipping database migration"
        fi
    else
        echo "Copying database..."
        sudo cp "$OLD_DATA_DIR/townhall.db" "$DATA_DIR/townhall.db"
        sudo chown "$CURRENT_USER:$CURRENT_USER" "$DATA_DIR/townhall.db"
        echo -e "${GREEN}✓${NC} Database migrated"
    fi
else
    echo -e "${YELLOW}⚠${NC}  No existing database found at $OLD_DATA_DIR/townhall.db"
    echo "   Database will be created on first run"
fi

echo ""
echo "Step 4: Migrating backups..."
echo ""

# Check if old backups exist
if [ -d "$OLD_DATA_DIR/backups" ] && [ "$(ls -A $OLD_DATA_DIR/backups 2>/dev/null)" ]; then
    echo "Found existing backups at $OLD_DATA_DIR/backups"
    echo "Copying backups..."
    sudo cp -r "$OLD_DATA_DIR/backups"/* "$DATA_DIR/backups/" 2>/dev/null || true
    sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$DATA_DIR/backups"
    echo -e "${GREEN}✓${NC} Backups migrated"
else
    echo -e "${GREEN}✓${NC} No existing backups to migrate"
fi

echo ""
echo "Step 5: Stopping PM2 service..."
echo ""

# Check if PM2 is installed and service is running
if command -v pm2 >/dev/null 2>&1; then
    if pm2 list | grep -q "townhall-backend"; then
        echo "Stopping PM2 service..."
        pm2 stop townhall-backend
        pm2 delete townhall-backend
        echo -e "${GREEN}✓${NC} PM2 service stopped and removed"
    else
        echo -e "${GREEN}✓${NC} No PM2 service running"
    fi
else
    echo -e "${GREEN}✓${NC} PM2 not installed, skipping"
fi

echo ""
echo "========================================="
echo -e "${GREEN}Migration completed successfully!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Build Docker image:"
echo "   docker-compose build"
echo ""
echo "2. Start Docker container:"
echo "   docker-compose up -d"
echo ""
echo "3. Verify it's running:"
echo "   docker-compose ps"
echo "   docker-compose logs"
echo ""
echo "4. (Optional) Enable auto-start on boot:"
echo "   See DOCKER.md for systemd setup instructions"
echo ""
echo "Database location: $DATA_DIR"
echo "Logs location: $LOG_DIR"
echo ""
