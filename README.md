# Townhall Q&A Poll Application

A web application that helps collect and rank the top 5 questions from employees to discuss in town hall meetings.

**Current Version: 1.1.2** | [Changelog](CHANGELOG.md)

![Application Screenshot](screenshot.png)

## Features

- Campaign management (create, view, close, delete)
- Question submission and voting
- Real-time updates via SSE
- Question editing by creator
- Anonymous user tracking

## Tech Stack

- **Frontend**: React 18 with Vite
- **Backend**: Node.js with Express
- **Database**: SQLite

## Quick Start

### Installation

```bash
npm run install:all
```

### Running the Application

**Start servers (development mode):**
```bash
./start-background.sh
```

**Start servers (production mode):**
```bash
./start-background.sh --prod
```

**Start production with Vite proxy:**
```bash
./start-background.sh --prod --vite-proxy
```

**Check status:**
```bash
./status-background.sh
```

**Stop servers:**
```bash
./stop-background.sh
```

**Using PM2 (recommended for production):**
```bash
./start-background.sh --pm2
# or with production mode
./start-background.sh --prod --pm2
```

Access the application at `http://localhost:3000`

## Scripts Reference

| Script | Description |
|--------|-------------|
| `./start-background.sh` | Start servers in background (dev mode) |
| `./start-background.sh --prod` | Start servers in production mode |
| `./start-background.sh --prod --vite-proxy` | Production mode with Vite proxy |
| `./start-background.sh --pm2` | Use PM2 process manager |
| `./status-background.sh` | Check server status |
| `./stop-background.sh` | Stop all servers |
| `./backup-db.sh` | Backup database |
| `./restore-db.sh <file>` | Restore database |
| `./setup-backup-cron.sh` | Setup automated backups |
| `./release.sh` | Create new release |
| `npm test` | Run all tests |

## PM2 Setup (One-time)

For production deployment with auto-start on boot:

```bash
./setup-pm2.sh
```

This sets up PM2 with auto-restart and boot startup. Run once per system.

## Database Backup

**Manual backup:**
```bash
./backup-db.sh --compress --retention 30
```

**Automated backups:**
```bash
./setup-backup-cron.sh
```

**Restore:**
```bash
./restore-db.sh <backup_file>
```

## Testing

```bash
npm test              # Run all tests
npm run test:backend  # Backend only
npm run test:frontend # Frontend only
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (x.Y.0): New features
- **PATCH** (x.y.Z): Bug fixes

**Create release:**
```bash
./release.sh
```

The release script automatically:
- Runs tests
- Bumps version numbers
- Updates CHANGELOG.md
- Creates git tag

## Project Structure

```
TownhallQAPoll/
├── frontend/          # React frontend
├── backend/           # Node.js/Express API
├── start-background.sh    # Start servers
├── stop-background.sh     # Stop servers
├── status-background.sh   # Check status
└── ecosystem.config.js    # PM2 configuration
```

## License

ISC
