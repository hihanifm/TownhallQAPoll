# Offline Deployment Guide

This guide explains how to deploy the Townhall Q&A Poll application to a Linux PC without internet access.

## Overview

The offline package is a tarball containing:
- Pre-installed `node_modules` (all dependencies included)
- Pre-built frontend (`frontend/dist`)
- Startup scripts and documentation
- No npm install required on the target machine

## Prerequisites

**Target Linux PC must have:**
- Node.js v16 or higher installed
- Ability to download files (via wget/curl, browser, or USB transfer)

## Building the Package

### Option 1: GitHub Actions (Recommended for macOS/Windows users)

GitHub Actions automatically builds Linux-compatible packages on Linux runners.

**Trigger via tag:**
```bash
git tag v1.12.0-offline
git push origin v1.12.0-offline
```

**Trigger manually:**
- Go to GitHub Actions tab
- Select "Build and Release Offline Package" workflow
- Click "Run workflow"
- Enter version (e.g., `v1.12.0-offline`)
- Click "Run workflow"

The workflow will:
1. Build on Ubuntu Linux (free runner)
2. Install all dependencies (with Linux binaries)
3. Build frontend
4. Create tarball
5. Upload to GitHub Releases

### Option 2: Manual Build on Linux Machine

If you have a Linux machine with internet access:

```bash
# Clone the repository
git clone <your-repo-url>
cd TownhallQAPoll

# Make script executable
chmod +x pack-offline.sh

# Build package
./pack-offline.sh
```

**Important:** Must build on Linux (same OS as target) because `sqlite3` is a native module with platform-specific binaries.

## Downloading the Package

### On the Linux PC (with certificate issues)

**Option 1: wget with certificate bypass**
```bash
wget --no-check-certificate https://github.com/YOUR_ORG/TownhallQAPoll/releases/download/v1.12.0-offline/townhall-qa-poll-1.12.0-offline.tar.gz
```

**Option 2: curl with certificate bypass**
```bash
curl -k -L -O https://github.com/YOUR_ORG/TownhallQAPoll/releases/download/v1.12.0-offline/townhall-qa-poll-1.12.0-offline.tar.gz
```

**Option 3: Browser download**
- Open browser on Linux PC
- Go to GitHub Releases page
- Click to download the tarball

**Option 4: Transfer via USB/network**
- Download tarball on another machine (macOS, Windows, etc.)
- Transfer to Linux PC via USB drive or network share
- Extract on Linux PC

## Installation

1. **Extract the tarball:**
   ```bash
   tar -xzf townhall-qa-poll-*-offline.tar.gz
   cd townhall-qa-poll-*-offline
   ```

2. **Run setup** (checks Node.js, creates directories, rebuilds sqlite3 for your platform):
   ```bash
   ./setup.sh
   ```

3. **Start the application:**
   ```bash
   ./start.sh          # Production mode (nohup background process)
   ./start.sh -pm2     # Production mode (PM2 with auto-restart)
   ```

4. **Access the application:**
   - Local: `http://localhost:33111`
   - Network: `http://<your-ip>:33111`

## Available Scripts

| Script | Purpose |
|--------|---------|
| `./setup.sh` | Check prerequisites, create directories, rebuild native modules |
| `./start.sh` | Start server in background (nohup) |
| `./start.sh -pm2` | Start server with PM2 (auto-restart on crash) |
| `./stop.sh` | Stop the running server |
| `./status.sh` | Show server status, ports, and log locations |

## Configuration

### Environment Variables

Customize the application using environment variables:

```bash
# Change port (default: 33111)
PORT=8080 ./start.sh

# Bind to localhost only (default: 0.0.0.0 for network access)
HOST=127.0.0.1 ./start.sh

# Combined
PORT=8080 HOST=0.0.0.0 ./start.sh

# Feedback moderation PIN (required for feedback admin actions)
FEEDBACK_MASTER_PIN=change-this-to-a-strong-pin ./start.sh
```

## Package Contents

```
townhall-qa-poll-*-offline/
├── backend/
│   ├── src/              # Backend source code
│   ├── node_modules/     # Pre-installed dependencies (Linux binaries)
│   ├── data/             # SQLite database (created on first run)
│   └── package.json
├── frontend/
│   ├── dist/             # Pre-built frontend
│   └── package.json
├── ecosystem.config.js   # PM2 configuration
├── setup.sh              # Prerequisite check and native module rebuild
├── start.sh              # Start server (nohup or PM2)
├── stop.sh               # Stop server
├── status.sh             # Show server status
├── DEPLOYMENT.md         # This file
└── README.md             # Project readme
```

## Database

The SQLite database is automatically created at `backend/data/townhall.db` on first run.

**Important:** The database persists in the `backend/data/` directory. To backup:
```bash
cp backend/data/townhall.db backup-townhall.db
```

## Stopping the Server

```bash
./stop.sh
```

Or press `Ctrl+C` if the server is running in the foreground.

## Troubleshooting

### "Node.js is not installed"
Install Node.js v16 or higher:
- Download from https://nodejs.org/
- Or use your Linux distribution's package manager

### "backend/node_modules not found"
The package may be corrupted. Re-download from GitHub Releases.

### "Port already in use"
Change the PORT environment variable or stop the process using that port:
```bash
# Find process using port 33111
lsof -i :33111
# Kill it (replace PID with actual process ID)
kill <PID>
```

### "Permission denied" when running scripts
Make the scripts executable:
```bash
chmod +x setup.sh start.sh stop.sh status.sh
```

### Certificate errors when downloading
Use `--no-check-certificate` flag with wget or `-k` flag with curl (see download options above).

## Platform Compatibility

**This package is built for Linux x64.**

The tarball includes native binaries (`sqlite3` module) compiled for Linux. To run on a different platform:
- Linux ARM64: Build on ARM64 Linux machine
- Other platforms: Not supported (use Docker or build on matching platform)

## Size Information

- Uncompressed `node_modules`: ~69MB (backend ~20MB, frontend ~49MB)
- Compressed tarball: ~30-50MB (gzip compression)

## Support

For more information:
- See `README.md` in the package
- Check the project repository: https://github.com/YOUR_ORG/TownhallQAPoll
- Review GitHub Releases for version history
