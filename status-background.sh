#!/bin/bash

# Script to check the status of background servers
# LINUX/macOS ONLY

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/server.pids"
LOG_DIR="$SCRIPT_DIR/logs"
BACKUP_DIR="$SCRIPT_DIR/backend/data/backups"
METADATA_FILE="$BACKUP_DIR/.last_backup_checksum"

# Function to get local IP address
get_local_ip() {
    # Try different methods to get local IP
    local ip=""
    
    # Method 1: Try ip command (Linux)
    if command -v ip >/dev/null 2>&1; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1)
    fi
    
    # Method 2: Try ifconfig (macOS/Linux)
    if [ -z "$ip" ] && command -v ifconfig >/dev/null 2>&1; then
        # Get IP from default interface (usually en0 on macOS, eth0 on Linux)
        ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    fi
    
    # Method 3: Try hostname (fallback)
    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    
    echo "$ip"
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "linux"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Function to check if ufw is active (Linux)
check_ufw_active() {
    if command -v ufw >/dev/null 2>&1; then
        local status=$(sudo ufw status 2>/dev/null | head -1)
        if echo "$status" | grep -q "Status: active"; then
            return 0
        fi
    fi
    return 1
}

# Function to check if a port is allowed in ufw (Linux)
check_ufw_port_allowed() {
    local port=$1
    if ! check_ufw_active; then
        return 0  # ufw not active, consider port as "allowed"
    fi
    
    # Check if port is explicitly allowed in ufw rules
    if sudo ufw status 2>/dev/null | grep -qE "^[[:space:]]*${port}/tcp[[:space:]]+ALLOW"; then
        return 0
    fi
    
    return 1
}

# Function to check if macOS firewall is active
check_macos_firewall_active() {
    if [ -f "/usr/libexec/ApplicationFirewall/socketfilterfw" ]; then
        local status=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)
        if echo "$status" | grep -q "enabled"; then
            return 0
        fi
    fi
    return 1
}

# Function to check firewall status and warn if ports might be blocked
check_firewall_status() {
    local os=$(detect_os)
    local ports_to_check=()
    local needs_warning=false
    
    # Determine which ports to check based on what's running
    if lsof -Pi :33000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        # Development mode - check both ports
        ports_to_check=(33000 33001)
    elif lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        # Production mode - only backend port
        ports_to_check=(33001)
    else
        # No servers running, check both ports anyway
        ports_to_check=(33000 33001)
    fi
    
    if [ "$os" = "linux" ]; then
        # Check ufw status (Linux)
        echo "Firewall Status (Linux - ufw):"
        if check_ufw_active; then
            for port in "${ports_to_check[@]}"; do
                if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                    # Port is in use, check if it's allowed
                    if ! check_ufw_port_allowed "$port"; then
                        needs_warning=true
                        echo "  Port $port: ⚠️  May be blocked by firewall"
                        echo "    To allow: sudo ufw allow $port/tcp"
                    else
                        echo "  Port $port: ✓ Allowed in firewall"
                    fi
                fi
            done
            
            if [ "$needs_warning" = true ]; then
                echo ""
                echo "  💡 Tip: If you can't access the server from other devices,"
                echo "     the firewall may be blocking the ports."
            fi
        else
            echo "  ℹ️  ufw is not active (no firewall restrictions detected)"
        fi
    elif [ "$os" = "macos" ]; then
        # Check macOS firewall status
        echo "Firewall Status (macOS):"
        if check_macos_firewall_active; then
            echo "  ℹ️  macOS firewall is enabled"
            echo "  Note: macOS firewall typically allows incoming connections by default"
            echo "  If you can't access the server from other devices, check:"
            echo "  System Settings → Network → Firewall → Options"
            echo "  Make sure 'Block all incoming connections' is NOT enabled"
        else
            echo "  ℹ️  macOS firewall is not enabled (no firewall restrictions detected)"
        fi
    else
        echo "Firewall Status:"
        echo "  ℹ️  Unable to detect firewall status (OS: $os)"
    fi
}

# Function to get version
get_version() {
    if [ -f "$SCRIPT_DIR/VERSION" ]; then
        cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]'
    elif [ -f "$SCRIPT_DIR/package.json" ]; then
        grep -o '"version": "[^"]*"' "$SCRIPT_DIR/package.json" | cut -d'"' -f4
    else
        echo "unknown"
    fi
}

VERSION=$(get_version)

echo "Townhall Q&A Poll Server Status"
echo "Version: $VERSION"
echo "================================"
echo ""

# Check if PM2 process is running
PM2_RUNNING=false
if command -v pm2 >/dev/null 2>&1; then
    if pm2 list 2>/dev/null | grep -q "townhall-backend"; then
        PM2_RUNNING=true
    fi
fi

# If PM2 process is running, show PM2 status
if [ "$PM2_RUNNING" = true ]; then
    echo "Mode: PRODUCTION (PM2)"
    echo ""
    echo "PM2 Status:"
    pm2 list | head -n 5
    echo ""
    pm2 describe townhall-backend 2>/dev/null | grep -E "(status|uptime|restarts|memory|cpu|pid)" || true
    echo ""
    echo "PM2 Logs location: ~/.pm2/logs/"
    echo "  - View logs: pm2 logs townhall-backend"
    echo "  - Monitor: pm2 monit"
    echo ""
    LOCAL_IP=$(get_local_ip)
    if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Access URLs:"
        echo "  Application:"
        echo "    - Local:  http://localhost:33001"
        if [ -n "$LOCAL_IP" ]; then
            echo "    - Network: http://$LOCAL_IP:33001"
        fi
        echo ""
        echo "Firewall Status:"
        echo "----------------"
        check_firewall_status
        echo ""
    fi
    exit 0
fi

# Otherwise, show nohup status (dev or prod-nohup mode)
MODE="UNKNOWN"
if lsof -Pi :33000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    MODE="DEVELOPMENT"
else
    if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        MODE="PRODUCTION (nohup)"
    fi
fi

if [ "$MODE" != "UNKNOWN" ]; then
    echo "Mode: $MODE"
    echo ""
fi

# Check PID file
if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found. Servers may not be running via start-background.sh"
    echo ""
else
    echo "From PID file:"
    PIDS=()
    while IFS= read -r pid; do
        if [ -n "$pid" ]; then
            PIDS+=($pid)
        fi
    done < "$PID_FILE"
    
    if [ ${#PIDS[@]} -ge 1 ]; then
        BACKEND_PID=${PIDS[0]}
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "  Backend (PID $BACKEND_PID):  ✓ Running"
        else
            echo "  Backend (PID $BACKEND_PID):  ✗ Not running"
        fi
    fi
    
    if [ ${#PIDS[@]} -ge 2 ]; then
        FRONTEND_PID=${PIDS[1]}
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            # Check if running in production mode by examining the process command
            FRONTEND_CMD=$(ps -p $FRONTEND_PID -o command= 2>/dev/null | tr -d '\n')
            if echo "$FRONTEND_CMD" | grep -q "vite preview"; then
                FRONTEND_MODE="PRODUCTION"
            elif echo "$FRONTEND_CMD" | grep -q "vite"; then
                FRONTEND_MODE="DEVELOPMENT"
            else
                FRONTEND_MODE=""
            fi
            if [ -n "$FRONTEND_MODE" ]; then
                echo "  Frontend (PID $FRONTEND_PID): ✓ Running ($FRONTEND_MODE)"
            else
                echo "  Frontend (PID $FRONTEND_PID): ✓ Running"
            fi
        else
            echo "  Frontend (PID $FRONTEND_PID): ✗ Not running"
        fi
    fi
    echo ""
fi

# Check by port
echo "Port status:"
if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:33001)
    echo "  Port 33001 (backend):  ✓ In use (PID: $PORT_PID)"
else
    echo "  Port 33001 (backend):  ✗ Not in use"
fi

if lsof -Pi :33000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:33000)
    echo "  Port 33000 (frontend): ✓ In use (PID: $PORT_PID)"
else
    echo "  Port 33000 (frontend): ✗ Not in use"
fi

echo ""

# Show access URLs
LOCAL_IP=$(get_local_ip)
if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :33000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Access URLs:"
    if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  Backend:"
        echo "    - Local:  http://localhost:33001"
        if [ -n "$LOCAL_IP" ]; then
            echo "    - Network: http://$LOCAL_IP:33001"
        fi
    fi
    if lsof -Pi :33000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  Frontend:"
        echo "    - Local:  http://localhost:33000"
        if [ -n "$LOCAL_IP" ]; then
            echo "    - Network: http://$LOCAL_IP:33000"
        fi
    fi
    echo ""
fi

# Check firewall status
if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :33000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Firewall Status:"
    echo "----------------"
    check_firewall_status
    echo ""
fi

# Show log file info
if [ -d "$LOG_DIR" ]; then
    echo "Log files:"
    if [ -f "$LOG_DIR/backend.log" ]; then
        BACKEND_SIZE=$(du -h "$LOG_DIR/backend.log" | cut -f1)
        echo "  Backend log:  $LOG_DIR/backend.log ($BACKEND_SIZE)"
    fi
    if [ -f "$LOG_DIR/frontend.log" ]; then
        FRONTEND_SIZE=$(du -h "$LOG_DIR/frontend.log" | cut -f1)
        echo "  Frontend log: $LOG_DIR/frontend.log ($FRONTEND_SIZE)"
    fi
    if [ -f "$LOG_DIR/frontend-build.log" ]; then
        BUILD_SIZE=$(du -h "$LOG_DIR/frontend-build.log" | cut -f1)
        echo "  Build log:    $LOG_DIR/frontend-build.log ($BUILD_SIZE)"
    fi
    echo ""
    echo "To view logs:"
    echo "  tail -f $LOG_DIR/backend.log"
    echo "  tail -f $LOG_DIR/frontend.log"
    if [ -f "$LOG_DIR/frontend-build.log" ]; then
        echo "  tail -f $LOG_DIR/frontend-build.log  # (production build log)"
    fi
    echo ""
fi

# Show backup status
echo "Backup Status:"
echo "--------------"

# Check if backup service is initialized (look for message in backend log)
BACKUP_INITIALIZED="Unknown"
if [ -f "$LOG_DIR/backend.log" ]; then
    if grep -q "Backup service initialized" "$LOG_DIR/backend.log" 2>/dev/null; then
        BACKUP_INITIALIZED="✓ Initialized (checking logs)"
    fi
fi

# Also check if backend is running (backup service runs with backend)
if lsof -Pi :33001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    if [ "$BACKUP_INITIALIZED" = "Unknown" ]; then
        BACKUP_INITIALIZED="✓ Backend running (cron should be active)"
    fi
else
    BACKUP_INITIALIZED="✗ Backend not running (cron inactive)"
fi

echo "  Cron status: $BACKUP_INITIALIZED"

# Check backup directory
if [ -d "$BACKUP_DIR" ]; then
    # Count backup files (exclude metadata file)
    BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "townhall-*.db" -type f 2>/dev/null | wc -l | tr -d ' ')
    
    # Get last backup timestamp from metadata file
    if [ -f "$METADATA_FILE" ]; then
        # Try to parse JSON timestamp (timestamp in milliseconds)
        LAST_BACKUP_TS=$(grep -o '"timestamp"[[:space:]]*:[[:space:]]*[0-9]*' "$METADATA_FILE" 2>/dev/null | grep -o '[0-9]*' | head -1)
        
        if [ -n "$LAST_BACKUP_TS" ]; then
            # Convert milliseconds to seconds for date command (macOS uses seconds)
            LAST_BACKUP_SEC=$((LAST_BACKUP_TS / 1000))
            
            # Get current time in seconds
            CURRENT_SEC=$(date +%s)
            
            # Calculate age
            AGE_SEC=$((CURRENT_SEC - LAST_BACKUP_SEC))
            AGE_DAYS=$((AGE_SEC / 86400))
            AGE_HOURS=$((AGE_SEC / 3600))
            AGE_MIN=$((AGE_SEC / 60))
            
            # Format last backup time
            # Try Linux format first (GNU date), then macOS/BSD format
            if command -v date >/dev/null 2>&1; then
                LAST_BACKUP_STR=$(date -d "@$LAST_BACKUP_SEC" "+%Y-%m-%d %H:%M:%S" 2>/dev/null)
                # If that failed (macOS/BSD), try macOS format
                if [ $? -ne 0 ] || [ -z "$LAST_BACKUP_STR" ]; then
                    LAST_BACKUP_STR=$(date -j -f "%s" "$LAST_BACKUP_SEC" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "Unknown")
                fi
            else
                LAST_BACKUP_STR="Unknown"
            fi
            
            # Format age
            if [ $AGE_DAYS -gt 0 ]; then
                AGE_STR="${AGE_DAYS} day(s) ago"
            elif [ $AGE_HOURS -gt 0 ]; then
                AGE_STR="${AGE_HOURS} hour(s) ago"
            elif [ $AGE_MIN -gt 0 ]; then
                AGE_STR="${AGE_MIN} minute(s) ago"
            else
                AGE_STR="Just now"
            fi
            
            echo "  Last backup:  $LAST_BACKUP_STR ($AGE_STR)"
        else
            echo "  Last backup:  No backup metadata found"
        fi
    else
        echo "  Last backup:  No backups created yet"
    fi
    
    echo "  Backup count: $BACKUP_COUNT file(s)"
    
    # Calculate total backup size
    if [ $BACKUP_COUNT -gt 0 ]; then
        BACKUP_TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        echo "  Total size:   $BACKUP_TOTAL_SIZE"
        
        # Show oldest and newest backup
        OLDEST_BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -name "townhall-*.db" -type f -printf '%T@ %f\n' 2>/dev/null | sort -n | head -1 | awk '{print $2}')
        NEWEST_BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -name "townhall-*.db" -type f -printf '%T@ %f\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}')
        
        # macOS compatibility (doesn't support -printf)
        if [ -z "$OLDEST_BACKUP" ]; then
            OLDEST_BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -name "townhall-*.db" -type f -exec stat -f "%B %N" {} \; 2>/dev/null | sort -n | head -1 | cut -d' ' -f2- | xargs basename 2>/dev/null)
            NEWEST_BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -name "townhall-*.db" -type f -exec stat -f "%B %N" {} \; 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2- | xargs basename 2>/dev/null)
        fi
        
        if [ -n "$NEWEST_BACKUP" ]; then
            echo "  Newest:       $NEWEST_BACKUP"
        fi
        if [ -n "$OLDEST_BACKUP" ] && [ "$OLDEST_BACKUP" != "$NEWEST_BACKUP" ]; then
            echo "  Oldest:       $OLDEST_BACKUP"
        fi
    fi
    
    echo "  Directory:    $BACKUP_DIR"
else
    echo "  Status:       Backup directory does not exist yet"
    echo "  Note:         Will be created on first backup"
fi

echo ""

# Show recent backup activity in logs
if [ -f "$LOG_DIR/backend.log" ]; then
    BACKUP_LOG_LINES=$(grep -i "\[Backup\]" "$LOG_DIR/backend.log" 2>/dev/null | tail -5)
    if [ -n "$BACKUP_LOG_LINES" ]; then
        echo "Recent backup activity (from logs):"
        echo "$BACKUP_LOG_LINES" | sed 's/^/  /'
        echo ""
    fi
fi

echo ""
