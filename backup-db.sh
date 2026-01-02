#!/bin/bash

# Database Backup Script for Townhall Q&A Poll
# Supports multiple backup strategies and retention policies

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DB_PATH="$SCRIPT_DIR/backend/data/townhall.db"
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="townhall_backup_${TIMESTAMP}.db"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Default settings
RETENTION_DAYS=30
COMPRESS=false
VERIFY=true
USE_SQLITE_BACKUP=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --retention|-r)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --compress|-c)
      COMPRESS=true
      shift
      ;;
    --no-verify)
      VERIFY=false
      shift
      ;;
    --simple-copy)
      USE_SQLITE_BACKUP=false
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -r, --retention DAYS    Keep backups for N days (default: 30)"
      echo "  -c, --compress          Compress backup file"
      echo "  --no-verify             Skip backup verification"
      echo "  --simple-copy           Use simple file copy instead of SQLite backup"
      echo "  -h, --help              Show this help message"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
  echo -e "${RED}❌ Error: Database not found at $DB_PATH${NC}"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "Townhall Q&A Poll Database Backup"
echo "=========================================="
echo "Database: $DB_PATH"
echo "Backup:   $BACKUP_PATH"
echo ""

# Perform backup
if [ "$USE_SQLITE_BACKUP" = true ]; then
  echo "Creating backup using SQLite backup command..."
  # SQLite backup is safer as it handles locked databases better
  if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_PATH" ".backup '$BACKUP_PATH'"
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ SQLite backup failed!${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}⚠️  sqlite3 command not found, falling back to simple copy${NC}"
    cp "$DB_PATH" "$BACKUP_PATH"
  fi
else
  echo "Creating backup using file copy..."
  cp "$DB_PATH" "$BACKUP_PATH"
fi

# Verify backup
if [ "$VERIFY" = true ]; then
  echo "Verifying backup..."
  if [ ! -f "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Backup file not created!${NC}"
    exit 1
  fi
  
  ORIGINAL_SIZE=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH" 2>/dev/null)
  BACKUP_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null)
  
  if [ "$ORIGINAL_SIZE" -ne "$BACKUP_SIZE" ]; then
    echo -e "${YELLOW}⚠️  Warning: Backup size ($BACKUP_SIZE) differs from original ($ORIGINAL_SIZE)${NC}"
  else
    echo -e "${GREEN}✓ Backup size verified${NC}"
  fi
  
  # Try to verify backup is a valid SQLite database
  if command -v sqlite3 &> /dev/null; then
    if sqlite3 "$BACKUP_PATH" "SELECT 1;" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Backup database integrity verified${NC}"
    else
      echo -e "${RED}❌ Backup database integrity check failed!${NC}"
      exit 1
    fi
  fi
fi

# Compress if requested
if [ "$COMPRESS" = true ]; then
  echo "Compressing backup..."
  gzip "$BACKUP_PATH"
  BACKUP_PATH="${BACKUP_PATH}.gz"
  BACKUP_NAME="${BACKUP_NAME}.gz"
  echo -e "${GREEN}✓ Backup compressed${NC}"
fi

# Get backup size
BACKUP_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null)
BACKUP_SIZE_MB=$(echo "scale=2; $BACKUP_SIZE / 1024 / 1024" | bc)

echo ""
echo -e "${GREEN}✓ Backup created successfully!${NC}"
echo "  File: $BACKUP_NAME"
echo "  Size: ${BACKUP_SIZE_MB} MB"
echo "  Path: $BACKUP_PATH"
echo ""

# Clean up old backups
if [ "$RETENTION_DAYS" -gt 0 ]; then
  echo "Cleaning up backups older than $RETENTION_DAYS days..."
  find "$BACKUP_DIR" -name "townhall_backup_*.db*" -type f -mtime +$RETENTION_DAYS -delete
  DELETED_COUNT=$(find "$BACKUP_DIR" -name "townhall_backup_*.db*" -type f | wc -l | tr -d ' ')
  echo "  Remaining backups: $DELETED_COUNT"
fi

echo ""
echo "=========================================="
echo "Backup completed successfully!"
echo "=========================================="
