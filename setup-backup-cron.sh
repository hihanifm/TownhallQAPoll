#!/bin/bash

# Setup Automated Backup Cron Job
# This script helps set up a cron job for automatic database backups

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-db.sh"

echo "=========================================="
echo "Automated Backup Cron Job Setup"
echo "=========================================="
echo ""

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "❌ Error: Backup script not found at $BACKUP_SCRIPT"
  exit 1
fi

# Make sure backup script is executable
chmod +x "$BACKUP_SCRIPT"

echo "This will set up a cron job to automatically backup your database."
echo ""
echo "Options:"
echo "  1. Daily backup at 2 AM (recommended)"
echo "  2. Hourly backup"
echo "  3. Custom schedule"
echo "  4. Remove existing backup cron job"
echo ""
read -p "Select option (1-4): " OPTION

case $OPTION in
  1)
    CRON_SCHEDULE="0 2 * * *"
    DESCRIPTION="Daily at 2 AM"
    ;;
  2)
    CRON_SCHEDULE="0 * * * *"
    DESCRIPTION="Every hour"
    ;;
  3)
    echo ""
    echo "Enter cron schedule (minute hour day month weekday):"
    echo "Examples:"
    echo "  '0 2 * * *'     - Daily at 2 AM"
    echo "  '0 */6 * * *'   - Every 6 hours"
    echo "  '0 2 * * 0'     - Weekly on Sunday at 2 AM"
    echo ""
    read -p "Cron schedule: " CRON_SCHEDULE
    DESCRIPTION="Custom: $CRON_SCHEDULE"
    ;;
  4)
    echo "Removing existing backup cron job..."
    crontab -l 2>/dev/null | grep -v "backup-db.sh" | crontab - 2>/dev/null || true
    echo "✓ Backup cron job removed"
    exit 0
    ;;
  *)
    echo "Invalid option"
    exit 1
    ;;
esac

# Create cron job entry
CRON_ENTRY="$CRON_SCHEDULE $BACKUP_SCRIPT --retention 30 --compress >> $SCRIPT_DIR/logs/backup-cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-db.sh"; then
  echo ""
  echo "⚠️  A backup cron job already exists!"
  read -p "Replace it? (yes/no): " REPLACE
  if [ "$REPLACE" = "yes" ]; then
    # Remove existing entry
    crontab -l 2>/dev/null | grep -v "backup-db.sh" | crontab -
  else
    echo "Cancelled."
    exit 0
  fi
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo ""
echo "✓ Cron job installed successfully!"
echo ""
echo "Schedule: $DESCRIPTION"
echo "Command:  $CRON_ENTRY"
echo ""
echo "To view your cron jobs: crontab -l"
echo "To edit cron jobs: crontab -e"
echo "To remove this cron job: ./setup-backup-cron.sh (option 4)"
echo ""
