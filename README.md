# Townhall Q&A Poll Application

A web application that helps collect and rank the top 5 questions from employees to discuss in town hall meetings.

**Current Version: 1.1.0** | [Changelog](CHANGELOG.md)

![Application Screenshot](screenshot.png)

## Features

- **Campaign Management**: Moderators can create new poll campaigns with optional initial questions
- **Question Submission**: Employees can anonymously submit questions
- **Voting System**: Employees can upvote questions they want to see answered
- **Top 5 Display**: Questions are automatically sorted by vote count, with the top 5 prominently displayed
- **Anonymity**: All interactions are anonymous - only localStorage-generated IDs are used
- **Duplicate Prevention**: Each user can only vote once per question (enforced via localStorage ID)

## Tech Stack

- **Frontend**: React 18 with Vite
- **Backend**: Node.js with Express
- **Database**: SQLite (local file-based database)

## Project Structure

```
TownhallQAPoll/
├── frontend/          # React frontend application
├── backend/           # Node.js/Express backend API
├── package.json       # Root package.json with convenience scripts
└── README.md          # This file
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher) - Download from [nodejs.org](https://nodejs.org/)
- npm (comes with Node.js) or yarn

### Installation

1. Install dependencies for both frontend and backend:

```bash
npm run install:all
```

Or install them separately:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Running the Application

1. Start the backend server (in one terminal):

```bash
# Development mode (default - more permissive)
npm run start:backend
# or for development with auto-reload:
npm run dev:backend

# Production mode (strict security)
npm run start:backend:prod
```

The backend will run on `http://localhost:3001`

**Note**: The scripts automatically set `NODE_ENV`:
- Development: `NODE_ENV=development` (allows testing with curl, Postman, etc.)
- Production: `NODE_ENV=production` (blocks direct API access)

2. Start the frontend development server (in another terminal):

```bash
npm run start:frontend
# or:
npm run dev:frontend
```

The frontend will run on `http://localhost:3000`

**Frontend API Configuration:**
- **Development Mode (Default)**: Frontend uses Vite as a reverse proxy to communicate with the backend
  - No configuration needed - works out of the box
  - Requests go through Vite dev server: `/api/*` → `http://localhost:3001/api/*`
  - No CORS issues
  - Always enabled in development mode
- **Production Mode**: Defaults to direct backend calls (no proxy)
  - **Default behavior**: Direct API calls (`VITE_USE_PROXY=false`)
  - **With proxy**: Use `--vite-proxy` flag to enable Vite proxy in production
  - Requires backend CORS to be properly configured when using direct calls
  - **Option**: Create `frontend/.env` file to override:
    ```
    VITE_USE_PROXY=false  # or true to enable proxy
    VITE_API_URL=http://localhost:3001
    ```

See `frontend/src/config/README.md` for detailed configuration options.

3. Open your browser and navigate to `http://localhost:3000`

## Running in Background (Linux/macOS only)

To run both servers in the background on Linux or macOS, use the provided shell scripts:

### Quick Start

1. **Start both servers in background (development mode):**
   ```bash
   ./start-background.sh
   ```

2. **Start both servers in background (production mode):**
   ```bash
   ./start-background.sh --prod
   # or
   ./start-background.sh -p
   # Production mode defaults to direct backend calls (no Vite proxy)
   ```

3. **Start production mode with Vite proxy enabled:**
   ```bash
   ./start-background.sh --prod --vite-proxy
   # or use the shortcut:
   ./start-background.sh -p -vp
   ```

4. **Check server status:**
   ```bash
   ./status-background.sh
   ```

5. **Stop both servers:**
   ```bash
   ./stop-background.sh
   ```

**Notes**: 
- The script automatically sets `NODE_ENV`:
  - Development mode (default): `NODE_ENV=development` - more permissive, allows curl/Postman
  - Production mode (`--prod`): `NODE_ENV=production` - strict security, blocks direct API access
- **Vite Proxy**:
  - **Development mode**: Always uses Vite proxy (required for CORS handling)
  - **Production mode**: Defaults to **no proxy** (direct backend calls)
  - Use `--vite-proxy` (or `-vp`) flag to enable proxy in production mode
  - When proxy is disabled, frontend calls backend directly (requires CORS configuration)

### What the scripts do:

- **`start-background.sh`** (Linux/macOS only)
  - Starts both backend and frontend servers in the background using `nohup`
  - Saves process IDs to `server.pids` for easy management
  - Logs output to `logs/backend.log` and `logs/frontend.log`
  - Checks if servers are already running before starting

- **`stop-background.sh`** (Linux/macOS only)
  - Stops both servers by their saved process IDs
  - Also checks and kills any processes using ports 3000 and 3001
  - Cleans up the PID file

- **`status-background.sh`** (Linux/macOS only)
  - Shows whether servers are running
  - Displays process IDs and port status
  - Shows log file locations and sizes

### Viewing Logs

While servers are running in the background, you can view their logs:

```bash
# View backend logs
tail -f logs/backend.log

# View frontend logs
tail -f logs/frontend.log

# View both logs side by side (requires multitail)
multitail logs/backend.log logs/frontend.log
```

### Notes

- The scripts use `nohup` to ensure servers continue running even if you close the terminal
- Logs are automatically created in the `logs/` directory
- If you manually stop servers, you may need to run `stop-background.sh` to clean up the PID file
- **These scripts are for Linux and macOS only.**

## Remote Access

The application is configured to accept connections from remote clients. Here are several ways to make it accessible:

### Option 1: Quick Development Access (ngrok)

For quick testing and sharing during development:

1. Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com)
2. Start your backend and frontend servers as usual
3. In a new terminal, run:
   ```bash
   ngrok http 3000
   ```
4. Share the ngrok URL (e.g., `https://abc123.ngrok.io`) with others

**Note:** The frontend proxy needs to know the backend URL. Set environment variable:
```bash
VITE_API_URL=http://your-ngrok-backend-url:3001 npm run dev:frontend
```

### Option 2: Local Network Access

To allow access from other devices on your local network:

1. Find your local IP address:
   - **macOS/Linux**: `ifconfig | grep "inet "` or `ip addr show`
2. Start the servers (they now listen on `0.0.0.0` by default)
3. Access from other devices using: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

**Security Note:** Make sure your firewall allows connections on ports 3000 and 3001.

### Option 3: Production Deployment

For production use, consider deploying to:

- **Railway** - Easy Node.js deployment with database support
- **Render** - Free tier available, supports both frontend and backend
- **Heroku** - Traditional PaaS option
- **DigitalOcean App Platform** - Simple deployment
- **Vercel** (frontend) + **Railway/Render** (backend) - Separate deployments

#### Environment Variables for Production

Create a `.env` file in the backend directory:
```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
```

For the frontend, set:
```env
VITE_API_URL=https://your-backend-url.com
```

### Option 4: Self-Hosted with Port Forwarding

1. Configure your router to forward ports 3000 (frontend) and 3001 (backend) to your machine
2. Use a dynamic DNS service (like DuckDNS) if you don't have a static IP
3. Access via your public IP or domain name

**⚠️ Security Warning:** Exposing your application directly to the internet without proper security measures (HTTPS, authentication, rate limiting) is not recommended for production use.

## Usage

### For Moderators

1. Click "New Campaign" to create a new poll
2. Enter a campaign title (required)
3. Optionally add a description and/or an initial question
4. Click "Create Campaign"

### For Employees

1. Select a campaign from the left pane
2. View questions in the right pane (sorted by vote count)
3. Click "↑ Upvote" on questions you want to see answered
4. Click "Ask a Question" to submit a new question
5. The top 5 questions are highlighted and shown at the top

## Database

The SQLite database is automatically created in `backend/data/townhall.db` on first run. The schema includes:

- **campaigns**: Stores poll campaigns
- **questions**: Stores questions within campaigns
- **votes**: Tracks upvotes with duplicate prevention

## Security

### Backend API Access Restrictions

The backend API is **restricted to only accept requests from the frontend application**. Direct access to the backend API is blocked for security.

**Security Features:**
- **CORS Protection**: Only requests from allowed frontend origins are accepted
- **Origin Validation**: Middleware validates that requests come from the authorized frontend
- **Automatic IP Support**: By default, any origin on port 3000 is allowed (works with IP addresses automatically)
- **Localhost Binding**: By default, backend binds to `127.0.0.1` (localhost only), preventing network access

**How It Works:**
- ✅ **No configuration needed for IP addresses!** If you access the frontend via `http://192.168.1.100:3000`, it will automatically work
- ✅ The system allows any origin on port 3000 (the frontend port) by default
- ✅ You can still explicitly set `FRONTEND_URL` for production domains
- ✅ Direct API access (e.g., `curl http://localhost:3001/api/campaigns`) is blocked

**Configuration:**

1. **Default (Most Secure)**: Backend only accessible from localhost
   ```bash
   # Backend binds to 127.0.0.1 by default
   # Frontend can be accessed via localhost or IP address - both work!
   npm run start:backend
   ```

2. **Allow Remote Backend Access** (if needed):
   ```bash
   # Set environment variable to allow network access to backend
   HOST=0.0.0.0 npm run start:backend
   ```
   ⚠️ **Warning**: When allowing remote access, origin validation still blocks direct API calls, but the backend port is exposed on the network.

3. **Custom Frontend URL** (for production):
   ```bash
   # Set your frontend URL (optional - IP addresses work automatically)
   FRONTEND_URL=https://your-frontend-domain.com npm run start:backend
   
   # Or multiple URLs (comma-separated)
   FRONTEND_URLS=http://localhost:3000,https://your-frontend-domain.com npm run start:backend
   ```

4. **Strict Mode** (only explicitly allowed origins):
   ```bash
   # Disable automatic port 3000 allowance (more restrictive)
   ALLOW_ANY_FRONTEND_PORT=false npm run start:backend
   ```
   This requires you to explicitly set `FRONTEND_URL` or `FRONTEND_URLS`.

**What happens if someone tries to access the backend directly?**
- **In Production**: They will receive a `403 Forbidden` error
- **In Development**: More permissive - allows localhost requests for testing (curl, Postman, etc.)
- The error message: "Forbidden: Direct API access is not allowed. Please use the frontend application."
- All unauthorized access attempts are logged to the console

**Development vs Production Mode:**
- **Development** (`NODE_ENV=development` or not set): 
  - ✅ Allows localhost requests without origin/referer (for testing with curl, Postman)
  - ✅ Allows any localhost or private IP origins
  - ✅ More permissive CORS settings
  - ✅ Set automatically by `npm run start:backend` or `./start-background.sh`
- **Production** (`NODE_ENV=production`):
  - 🔒 Strict origin validation
  - 🔒 Blocks all direct API calls
  - 🔒 Only allows explicitly configured frontend origins
  - ✅ Set automatically by `npm run start:backend:prod` or `./start-background.sh --prod`

**Note**: The frontend uses Vite's proxy to communicate with the backend, so all requests go through the frontend application, ensuring proper origin validation.

## API Endpoints

- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns/:id/questions` - Get questions for a campaign
- `POST /api/campaigns/:id/questions` - Create new question
- `POST /api/questions/:id/upvote` - Upvote a question
- `GET /api/questions/:id/votes` - Check if user has voted

**Note**: These endpoints can only be accessed through the frontend application. Direct API access is blocked.

## Anonymity & Privacy

- No personal information is collected or stored
- Each user is assigned a unique ID stored in localStorage
- This ID is used only to prevent duplicate votes
- The ID persists across sessions but is not linked to any personal data

## Production Deployment with PM2

PM2 is a process manager for Node.js applications that ensures your application stays running, automatically restarts on crashes, and starts on system boot.

### Prerequisites

- Node.js installed
- PM2 installed globally: `npm install -g pm2`

### Quick Setup

1. **Run the setup script:**
   ```bash
   ./setup-pm2.sh
   ```
   
   This script will:
   - Check/install PM2
   - Build the frontend for production
   - Start both backend and frontend with PM2
   - Guide you through setting up auto-start on boot

2. **Set up auto-start on boot:**
   
   After running the setup script, PM2 will output a command like:
   ```bash
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u YOUR_USER --hp /home/YOUR_USER
   ```
   
   Copy and run that command (requires sudo), then:
   ```bash
   pm2 save
   ```

### Manual PM2 Setup

If you prefer to set up manually:

1. **Build the frontend:**
   ```bash
   npm run build:frontend
   ```

2. **Start with PM2:**
   ```bash
   npm run pm2:start
   ```

3. **Save PM2 process list:**
   ```bash
   npm run pm2:save
   ```

4. **Set up startup on boot:**
   ```bash
   npm run pm2:startup
   # Then run the command it outputs with sudo
   pm2 save
   ```

### PM2 Management Commands

```bash
# Check status
npm run pm2:status
# or: pm2 status

# View logs
npm run pm2:logs
# or: pm2 logs

# Restart applications
npm run pm2:restart

# Stop applications
npm run pm2:stop

# Remove from PM2
npm run pm2:delete

# Save current process list
npm run pm2:save
```

### Development vs Production Mode

PM2 supports both development and production environments:

**Production Mode (Default for setup script):**
```bash
# Start in production mode without proxy (builds frontend first)
# Equivalent to: ./start-background.sh --prod (default: no proxy)
npm run pm2:start:prod
# or
pm2 start ecosystem.config.js --env production
```
- Backend: `NODE_ENV=production` (strict security)
- Frontend: Runs `npm run preview` (serves built files)
- Frontend must be built first: `npm run build:frontend`
- Uses direct backend calls (`VITE_USE_PROXY=false`) - **default for production**

**Production Mode with Proxy:**
```bash
# Start in production mode with Vite proxy
# Equivalent to: ./start-background.sh --prod --vite-proxy
npm run pm2:start:prod:proxy
# or
pm2 start ecosystem.config.js --env production_proxy
```
- Backend: `NODE_ENV=production` (strict security)
- Frontend: Runs `npm run preview` (serves built files)
- Frontend must be built first: `npm run build:frontend`
- Uses Vite proxy (`VITE_USE_PROXY=true`) - **optional for production**

**Development Mode:**
```bash
# Start in development mode
npm run pm2:start:dev
# or
pm2 start ecosystem.config.js --env development
```
- Backend: `NODE_ENV=development` (more permissive)
- Frontend: Runs `npm run dev` (Vite dev server with hot reload)
- No build required
- Uses Vite proxy (`VITE_USE_PROXY=true`)

**Switching between modes:**
```bash
# Restart in development mode
npm run pm2:restart:dev

# Restart in production mode without proxy (rebuilds frontend)
npm run pm2:restart:prod

# Restart in production mode with proxy (rebuilds frontend)
npm run pm2:restart:prod:proxy
```

**Note:** The frontend wrapper script (`frontend/start-pm2.sh`) automatically detects `NODE_ENV` and runs the appropriate command (`dev` or `preview`).

### Mapping: start-background.sh to PM2

The following table shows how `start-background.sh` options map to PM2 environments:

| start-background.sh Command | PM2 Equivalent | npm Script |
|----------------------------|----------------|------------|
| `./start-background.sh` (dev mode) | `pm2 start ecosystem.config.js --env development` | `npm run pm2:start:dev` |
| `./start-background.sh --prod` | `pm2 start ecosystem.config.js --env production` | `npm run pm2:start:prod` |
| `./start-background.sh --prod --vite-proxy` | `pm2 start ecosystem.config.js --env production_proxy` | `npm run pm2:start:prod:proxy` |

**Key Points:**
- **Production default**: No Vite proxy (direct backend calls) - matches `production` environment
- **Production with proxy**: Use `--vite-proxy` flag to enable proxy - matches `production_proxy` environment
- **Development**: Always uses Vite proxy (required for CORS handling)
- PM2 `production` environment = no proxy (direct calls) - **default**
- PM2 `production_proxy` environment = with proxy - **optional**

### PM2 Configuration

The PM2 configuration is in `ecosystem.config.js`. It includes:

- **Backend**: Runs on port 3001
  - Development: `NODE_ENV=development` (more permissive CORS)
  - Production: `NODE_ENV=production` (strict security)
- **Frontend**: Runs on port 3000
  - Development: `npm run dev` (Vite dev server with hot reload)
  - Production: `npm run preview` (serves built files, requires build first)
- **Auto-restart**: Enabled with memory limits
- **Logging**: Logs saved to `logs/` directory
- **Environments**: 
  - `env`: Default (development)
  - `env_development`: Explicit development settings
  - `env_production`: Production settings (no proxy, direct backend calls)
  - `env_production_proxy`: Production settings (with Vite proxy)

### Customizing Environment Variables

Edit `ecosystem.config.js` to customize:

- `HOST`: Backend host (default: `127.0.0.1` for security, use `0.0.0.0` for remote access)
- `PORT`: Backend port (default: `3001`)
- `FRONTEND_URL`: Production frontend URL for CORS
- `VITE_API_URL`: Backend URL for frontend (default: `http://localhost:3001`)

After changes, restart PM2:
```bash
npm run pm2:restart
```

### Logs

PM2 logs are stored in the `logs/` directory:
- `pm2-backend.log` - Combined backend logs
- `pm2-backend-error.log` - Backend errors
- `pm2-backend-out.log` - Backend output
- `pm2-frontend.log` - Combined frontend logs
- `pm2-frontend-error.log` - Frontend errors
- `pm2-frontend-out.log` - Frontend output

View logs in real-time:
```bash
pm2 logs townhall-backend
pm2 logs townhall-frontend
pm2 logs  # All logs
```

### Continuous Crash Protection

**What happens if the app crashes continuously?**

PM2 has built-in protection against infinite restart loops:

1. **Restart Attempts**: PM2 will attempt to restart the app up to **5 times** (configured in `ecosystem.config.js`)
2. **Stability Check**: The app must run for at least **60 seconds** (`min_uptime`) to be considered "stable"
3. **Exponential Backoff**: Restart delays increase with each failed attempt (starts at 100ms)
4. **Final State**: After 5 failed restarts, PM2 stops trying and marks the app as **"errored"**

**When an app is in "errored" state:**
- The app will **NOT** automatically restart
- PM2 will **NOT** try again until manually restarted
- You'll see `status: errored` in `pm2 status`
- This happens after 5 failed restart attempts (app crashes within 60 seconds each time)

**How to handle continuous crashes:**

1. **Check the status:**
   ```bash
   ./monitor-pm2.sh
   # or
   pm2 status
   ```

2. **Investigate the cause:**
   ```bash
   # View error logs
   pm2 logs townhall-backend --err
   pm2 logs townhall-frontend --err
   
   # Get detailed information
   pm2 describe townhall-backend
   ```

3. **Common causes:**
   - Port already in use (check with `lsof -i :3001` or `lsof -i :3000`)
   - Database file permissions or corruption
   - Missing environment variables
   - Code errors or syntax issues
   - Memory exhaustion (check with `pm2 monit`)

4. **After fixing the issue, restart:**
   ```bash
   pm2 restart townhall-backend
   pm2 restart townhall-frontend
   # or restart all
   npm run pm2:restart
   ```

5. **Reset restart counter** (if needed):
   ```bash
   pm2 reset townhall-backend
   pm2 reset townhall-frontend
   ```

**Monitoring for crashes:**

Run the monitoring script periodically:
```bash
./monitor-pm2.sh
```

Or set up a cron job to check every 5 minutes:
```bash
*/5 * * * * /path/to/TownhallQAPoll/monitor-pm2.sh >> /path/to/TownhallQAPoll/logs/monitor.log 2>&1
```

### Troubleshooting

**PM2 processes not starting on boot:**
1. Verify startup script: `pm2 startup`
2. Run the generated command with sudo
3. Save: `pm2 save`

**Applications keep restarting:**
- Check logs: `pm2 logs`
- Check memory usage: `pm2 monit`
- Verify ports 3000 and 3001 are available
- Run `./monitor-pm2.sh` to check for errored state

**App in "errored" state (stopped after continuous crashes):**
- Check error logs: `pm2 logs --err`
- Investigate the root cause (see "Continuous Crash Protection" above)
- Fix the issue, then restart: `pm2 restart <app-name>`
- Reset restart counter if needed: `pm2 reset <app-name>`

**Frontend not building:**
- Ensure dependencies are installed: `npm run install:all`
- Check frontend build logs: `cd frontend && npm run build`

## Development

### Backend Development

The backend uses nodemon for auto-reload during development. Start with:

```bash
cd backend
npm run dev
```

### Frontend Development

The frontend uses Vite for fast development. Start with:

```bash
cd frontend
npm run dev
```

## Testing

The project includes comprehensive unit tests to ensure code quality and prevent regressions.

### Running Tests

**Run all tests:**
```bash
npm test
```

**Run backend tests only:**
```bash
npm run test:backend
# or
cd backend && npm test
```

**Run frontend tests only:**
```bash
npm run test:frontend
# or
cd frontend && npm test
```

**Watch mode (for development):**
```bash
npm run test:watch
# Runs both backend and frontend tests in watch mode
```

**Backend watch mode:**
```bash
npm run test:backend:watch
```

**Frontend watch mode:**
```bash
npm run test:frontend:watch
```

### Test Coverage

**Backend:**
```bash
cd backend && npm test
# Coverage report is generated automatically
```

**Frontend:**
```bash
cd frontend && npm test
# Coverage report is generated automatically
```

### Test Structure

**Backend Tests** (`backend/__tests__/`):
- `routes/campaigns.test.js` - Campaign API endpoint tests
- `routes/questions.test.js` - Question API endpoint tests
- `routes/votes.test.js` - Vote API endpoint tests
- Uses Jest with Supertest for API testing
- Uses a separate test database (`test-townhall.db`)

**Frontend Tests** (`frontend/src/__tests__/`):
- `components/` - React component tests
- `services/` - API service tests
- `utils/` - Utility function tests
- `config/` - Configuration tests
- Uses Vitest with React Testing Library

### Writing New Tests

When adding new features, ensure you:
1. Write tests for new API endpoints (backend)
2. Write tests for new components (frontend)
3. Write tests for new utility functions
4. Run tests before committing: `npm test`

### CI/CD Integration

Tests can be run in CI/CD pipelines:
```bash
# Backend CI mode
cd backend && npm run test:ci

# Frontend CI mode  
cd frontend && npm test
```

## Database Backup

The application includes a comprehensive backup system for the SQLite database in production environments.

### Manual Backup

**Create a backup:**
```bash
./backup-db.sh
```

**Options:**
- `--retention DAYS` - Keep backups for N days (default: 30)
- `--compress` - Compress backup file (saves space)
- `--no-verify` - Skip backup verification
- `--simple-copy` - Use simple file copy instead of SQLite backup command

**Examples:**
```bash
# Basic backup
./backup-db.sh

# Compressed backup with 60-day retention
./backup-db.sh --compress --retention 60

# Quick backup without verification
./backup-db.sh --no-verify
```

### Restore Database

**Restore from backup:**
```bash
./restore-db.sh <backup_file>
```

**Examples:**
```bash
# List available backups and restore
./restore-db.sh

# Restore specific backup
./restore-db.sh townhall_backup_20240115_020000.db

# Force restore (skip confirmation)
./restore-db.sh townhall_backup_20240115_020000.db --force
```

**Important:** The restore script automatically creates a safety backup of your current database before restoring.

### Automated Backups (Cron)

**Set up automated backups:**
```bash
./setup-backup-cron.sh
```

This interactive script helps you:
1. Set up daily backups (recommended: 2 AM)
2. Set up hourly backups
3. Configure custom schedule
4. Remove existing backup cron job

**View your cron jobs:**
```bash
crontab -l
```

**Manual cron setup example:**
```bash
# Daily backup at 2 AM with compression and 30-day retention
0 2 * * * /path/to/TownhallQAPoll/backup-db.sh --compress --retention 30 >> /path/to/TownhallQAPoll/logs/backup-cron.log 2>&1
```

### Backup Storage

- **Location:** `./backups/` directory
- **Naming:** `townhall_backup_YYYYMMDD_HHMMSS.db`
- **Compressed:** `townhall_backup_YYYYMMDD_HHMMSS.db.gz`

### Backup Strategies

**1. Local Backups (Default)**
- Backups stored in `./backups/` directory
- Automatic cleanup based on retention policy
- Fast and simple

**2. Remote Backups (Recommended for Production)**
You can extend the backup script to:
- Copy backups to cloud storage (S3, Google Drive, etc.)
- Send backups to remote server via SCP/RSYNC
- Upload to backup service

**Example: Add S3 upload to backup script:**
```bash
# After backup creation, add:
aws s3 cp "$BACKUP_PATH" s3://your-bucket/backups/
```

**3. PM2 Integration**
You can add backup hooks to PM2 ecosystem config:
```javascript
// In ecosystem.config.js
post_update: './backup-db.sh --compress'
```

### Backup Best Practices

1. **Regular Backups:** Set up daily automated backups
2. **Retention Policy:** Keep at least 30 days of backups
3. **Off-site Storage:** Copy backups to remote location
4. **Test Restores:** Periodically test restore process
5. **Monitor Backups:** Check backup logs regularly
6. **Before Updates:** Always backup before deployments

### Backup Verification

The backup script automatically:
- Verifies backup file was created
- Checks file size matches original
- Validates SQLite database integrity
- Reports any issues

### Troubleshooting

**Backup fails:**
- Check database file permissions
- Ensure backup directory is writable
- Verify SQLite is installed (`sqlite3 --version`)

**Restore fails:**
- Ensure backup file is not corrupted
- Check database directory permissions
- Verify backup file is complete (check file size)

**Cron job not running:**
- Check cron service is running: `service cron status`
- View cron logs: `grep CRON /var/log/syslog`
- Check backup log: `tail -f logs/backup-cron.log`

## Versioning and Releases

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (X.0.0): Breaking changes that require migration or API changes
- **MINOR** (x.Y.0): New features that are backward compatible
- **PATCH** (x.y.Z): Bug fixes and small improvements

### Release Process

**Automated Release Script:**
```bash
./release.sh
```

The release script will:
1. Check for uncommitted changes
2. Prompt for version bump type (major/minor/patch)
3. Update all `package.json` files
4. Update README version badge
5. Update CHANGELOG.md with new version header
6. Commit version changes
7. Create git tag
8. Optionally push to remote

**Manual Release Process:**
```bash
# 1. Update versions in package.json files
# 2. Update CHANGELOG.md with release notes
# 3. Update README.md version badge
# 4. Commit changes
git commit -m "Release v1.1.0"

# 5. Create and push tag
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main --tags
```

**View Release History:**
```bash
# List all tags
git tag -l

# View tag details
git show v1.1.0

# View CHANGELOG
cat CHANGELOG.md
```

### Release Checklist

Before creating a release:
- [ ] All features are complete and tested
- [ ] All tests are passing (`npm test`)
- [ ] CHANGELOG.md is updated with release notes
- [ ] README.md is up to date
- [ ] Version numbers are consistent across all package.json files
- [ ] Database migrations (if any) are documented
- [ ] Breaking changes are clearly documented

## License

ISC

