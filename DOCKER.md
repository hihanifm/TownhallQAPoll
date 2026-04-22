# Docker Deployment Guide

This guide explains how to deploy the Townhall Q&A Poll application using Docker.

## Overview

The Docker setup provides:
- **Isolated environment**: Application runs in a container
- **Consistent deployment**: Same environment across different machines
- **Easy management**: Single command to start/stop
- **Safe data storage**: Database and logs stored in system directories (`/var/lib/townhall/`, `/var/log/townhall/`)
- **Auto-restart**: Container restarts automatically on failure
- **Health monitoring**: Built-in health checks

## Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher (or Docker Compose plugin)
- **Linux**: Tested on Ubuntu/Debian, but should work on any Linux distribution

### Installing Docker

**Ubuntu/Debian:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER
# Log out and log back in for changes to take effect

# Install Docker Compose plugin (or standalone docker-compose)
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

**Verify installation:**
```bash
docker --version
docker compose version  # or: docker-compose --version
```

## Quick Start

### 1. Initial Setup

Run the setup script to install dependencies:
```bash
./setup.sh
```

### 2. Migrate from PM2 (if applicable)

If you're migrating from PM2, run the migration script:
```bash
./migrate-to-docker.sh
```

This script will:
- Stop PM2 service
- Create safe directories (`/var/lib/townhall/data/`, `/var/log/townhall/`)
- Copy existing database to safe location
- Copy existing backups
- Set proper permissions

### 3. Build and Start

**Option A: Using start-background.sh script (Recommended)**
```bash
./start-background.sh --docker
```

**Option B: Using docker-compose directly**
```bash
# Build the image
docker-compose build

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Verify

Check if the container is running:
```bash
docker-compose ps
# or
./status-background.sh
```

Access the application:
- Local: http://localhost:33101
- Network: http://<your-ip>:33101

## Directory Structure

### Safe Directories (on Host)

- **Database**: `/var/lib/townhall/data/townhall.db`
- **Backups**: `/var/lib/townhall/data/backups/`
- **Logs**: `/var/log/townhall/` (optional, Docker logs are also available)

These directories are mounted as volumes in the container, ensuring data persists across container restarts.

### Container Structure

- **Application code**: `/app/backend/`
- **Built frontend**: `/app/backend/public/`
- **Database**: `/app/backend/data/` (mapped to `/var/lib/townhall/data/` on host)
- **Logs**: `/app/logs/` (mapped to `/var/log/townhall/` on host)

## Environment Variables

### Build-time Variables

These are embedded into the frontend during build:

- `VITE_ENABLE_BROWSER_RESTRICTION`: Set to `true` by default in docker-compose.yml
  - Enables browser restrictions in production
  - Configure allowed browsers in `frontend/src/config/browserConfig.js`

### Runtime Variables

Set in `docker-compose.yml` or `.env` file:

- `NODE_ENV`: `production` (set automatically)
- `HOST`: `0.0.0.0` (set automatically, allows network access)
- `PORT`: `33101` (set automatically)
- `FRONTEND_URL`: Optional, for CORS validation

**Example `.env` file:**
```bash
FRONTEND_URL=http://localhost:33100
```

## Managing the Container

### Start/Stop/Status

**Using scripts (Recommended):**
```bash
# Start
./start-background.sh --docker

# Stop
./stop-background.sh

# Status
./status-background.sh
```

**Using docker-compose:**
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Status
docker-compose ps

# View logs
docker-compose logs -f

# Restart
docker-compose restart
```

### Viewing Logs

```bash
# Follow logs (real-time)
docker-compose logs -f

# Last 50 lines
docker-compose logs --tail=50

# Specific service logs
docker-compose logs townhall-app
```

### Container Management

```bash
# View container stats
docker stats townhall-qa-poll

# Execute command in container
docker-compose exec townhall-app sh

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d
```

## Auto-Start on Boot

To ensure the Docker container starts automatically on system boot:

### 1. Install systemd Service

```bash
# Edit the service file to set the correct working directory
# Replace %h with your home directory or use absolute path
sed "s|%h|$HOME|g" townhall-docker.service > /tmp/townhall-docker.service

# Copy to systemd
sudo cp /tmp/townhall-docker.service /etc/systemd/system/townhall-docker.service

# Or manually edit the WorkingDirectory in townhall-docker.service
# Then copy it:
sudo cp townhall-docker.service /etc/systemd/system/
```

### 2. Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (starts on boot)
sudo systemctl enable townhall-docker.service

# Start service now
sudo systemctl start townhall-docker.service

# Check status
sudo systemctl status townhall-docker.service
```

### 3. Verify

```bash
# Check if service is enabled
sudo systemctl is-enabled townhall-docker.service

# View service logs
sudo journalctl -u townhall-docker.service -f
```

## Database Management

### Backup

The application automatically creates backups daily at midnight. Backups are stored in:
```
/var/lib/townhall/data/backups/
```

**Manual backup:**
```bash
sudo cp /var/lib/townhall/data/townhall.db /var/lib/townhall/data/backups/manual-backup-$(date +%Y%m%d_%H%M%S).db
```

### Restore

```bash
# Stop container
docker-compose down

# Restore from backup
sudo cp /var/lib/townhall/data/backups/backup-YYYYMMDD_HHMMSS.db /var/lib/townhall/data/townhall.db

# Start container
docker-compose up -d
```

### Database Location

The database is stored at:
- **Host**: `/var/lib/townhall/data/townhall.db`
- **Container**: `/app/backend/data/townhall.db`

The volume mount ensures the database persists even if the container is removed.

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs

# Check if port is in use
lsof -i :33101

# Check container status
docker-compose ps
docker ps -a
```

### Database issues

```bash
# Check database file permissions
ls -la /var/lib/townhall/data/

# Fix permissions (replace $USER with your username)
sudo chown -R $USER:$USER /var/lib/townhall/data/
```

### Build fails

```bash
# Clean build (no cache)
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t test-build .

# View build logs
docker-compose build 2>&1 | tee build.log
```

### Health check failing

```bash
# Check container health
docker inspect townhall-qa-poll | grep -A 10 Health

# Test health endpoint manually
curl http://localhost:33101/api/health

# Check if wget is available in container
docker-compose exec townhall-app which wget
```

### Permission denied errors

```bash
# Ensure directories exist and have correct permissions
sudo mkdir -p /var/lib/townhall/data
sudo mkdir -p /var/log/townhall
sudo chown -R $USER:$USER /var/lib/townhall/
sudo chown -R $USER:$USER /var/log/townhall/
```

### Container keeps restarting

```bash
# Check logs for errors
docker-compose logs --tail=100

# Check container exit code
docker ps -a | grep townhall-qa-poll

# Inspect container
docker inspect townhall-qa-poll
```

## Migration from PM2

If you're currently using PM2:

1. **Run migration script:**
   ```bash
   ./migrate-to-docker.sh
   ```

2. **Build and start Docker:**
   ```bash
   ./start-background.sh --docker
   ```

3. **Verify everything works:**
   ```bash
   ./status-background.sh
   curl http://localhost:33101/api/health
   ```

4. **Remove PM2 startup (if configured):**
   ```bash
   pm2 unstartup
   ```

5. **Set up Docker auto-start** (see Auto-Start on Boot section above)

## Updating the Application

### Update Code

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d
```

### Update Dependencies

```bash
# Rebuild with no cache to get latest dependencies
docker-compose build --no-cache
docker-compose up -d
```

## Security Considerations

1. **Firewall**: Ensure port 33101 is properly configured in your firewall
2. **Network access**: The container binds to `0.0.0.0` (all interfaces) by default
3. **Database location**: Database is stored in `/var/lib/townhall/data/` (protected system directory)
4. **Permissions**: Directories should be owned by the user running Docker
5. **Browser restrictions**: Enabled by default (`VITE_ENABLE_BROWSER_RESTRICTION=true`)

## Comparison: Docker vs PM2

| Feature | Docker | PM2 |
|---------|--------|-----|
| Isolation | Full container isolation | Process-level |
| Portability | Works anywhere Docker runs | Requires Node.js on host |
| Data storage | Safe system directories | Project directory |
| Auto-restart | Built-in (unless-stopped) | Built-in (autorestart) |
| Health checks | Built-in Docker healthchecks | Manual monitoring |
| Resource limits | Configurable in docker-compose | Configurable in ecosystem.config.js |
| Logs | Docker logs + optional file logs | PM2 logs + file logs |

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PM2_SETUP.md](PM2_SETUP.md) - For PM2 setup (alternative deployment)

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Check status: `./status-background.sh`
- Review this documentation
- Check the main [README.md](README.md)
