#!/bin/bash

# Database Restore Script for Townhall Q&A Poll

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DB_PATH="$SCRIPT_DIR/backend/data/townhall.db"
BACKUP_DIR="$SCRIPT_DIR/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup_file> [--force]"
  echo ""
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/townhall_backup_*.db* 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
  exit 1
fi

BACKUP_FILE="$1"
FORCE=false

if [ "$#" -gt 1 ] && [ "$2" = "--force" ]; then
  FORCE=true
fi

# Resolve backup file path
if [ ! -f "$BACKUP_FILE" ]; then
  # Try relative to backup directory
  if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
  else
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
  fi
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

echo "=========================================="
echo "Townhall Q&A Poll Database Restore"
echo "=========================================="
echo "Backup file: $BACKUP_FILE"
echo "Target:      $DB_PATH"
echo ""

# Check if database exists and is not empty
if [ -f "$DB_PATH" ] && [ -s "$DB_PATH" ]; then
  if [ "$FORCE" != true ]; then
    echo -e "${YELLOW}⚠️  Warning: Database already exists!${NC}"
    echo "This will overwrite the existing database."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
      echo "Restore cancelled."
      exit 0
    fi
  fi
  
  # Create backup of current database before restore
  BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  SAFETY_BACKUP="$BACKUP_DIR/safety_backup_before_restore_${BACKUP_TIMESTAMP}.db"
  echo "Creating safety backup of current database..."
  cp "$DB_PATH" "$SAFETY_BACKUP"
  echo -e "${GREEN}✓ Safety backup created: $(basename $SAFETY_BACKUP)${NC}"
  echo ""
fi

# Decompress if needed
RESTORE_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Decompressing backup..."
  RESTORE_FILE="${BACKUP_FILE%.gz}"
  gunzip -c "$BACKUP_FILE" > "$RESTORE_FILE"
  TEMP_FILE=true
else
  TEMP_FILE=false
fi

# Ensure data directory exists
mkdir -p "$(dirname "$DB_PATH")"

# Restore database
echo "Restoring database..."
cp "$RESTORE_FILE" "$DB_PATH"

# Clean up temporary file if created
if [ "$TEMP_FILE" = true ]; then
  rm "$RESTORE_FILE"
fi

# Verify restore
echo "Verifying restored database..."
if [ ! -f "$DB_PATH" ] || [ ! -s "$DB_PATH" ]; then
  echo -e "${RED}❌ Error: Restore failed!${NC}"
  exit 1
fi

# Check database integrity
if command -v sqlite3 &> /dev/null; then
  if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo -e "${GREEN}✓ Database integrity verified${NC}"
  else
    echo -e "${RED}❌ Warning: Database integrity check failed!${NC}"
    echo "The restored database may be corrupted."
  fi
fi

echo ""
echo -e "${GREEN}✓ Database restored successfully!${NC}"
echo ""
echo "=========================================="
echo "Restore completed!"
echo "=========================================="
echo ""
echo "Note: If you're using PM2, you may need to restart the backend:"
echo "  pm2 restart townhall-backend"
echo ""
