# Townhall Q&A Poll Application

A web application that helps collect and rank the top 5 questions from employees to discuss in town hall meetings.

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

#### Option 1: Automated Setup (Recommended for Linux/macOS)

Run the setup script which will check prerequisites, create necessary directories, and install all dependencies:

```bash
./setup.sh
```

The setup script will:
- ✓ Check for Node.js and npm
- ✓ Verify Node.js version (requires v16+)
- ✓ Create necessary directories (`logs/`, `backend/data/`)
- ✓ Install backend dependencies
- ✓ Install frontend dependencies
- ✓ Check for security vulnerabilities
- ✓ Display next steps

#### Option 2: Manual Installation

If you prefer to install manually:

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

The backend will run on `http://localhost:33001`

**Note**: The scripts automatically set `NODE_ENV`:
- Development: `NODE_ENV=development` (allows testing with curl, Postman, etc.)
- Production: `NODE_ENV=production` (blocks direct API access)

2. Start the frontend development server (in another terminal):

```bash
npm run start:frontend
# or:
npm run dev:frontend
```

The frontend will run on `http://localhost:33000`

3. Open your browser and navigate to `http://localhost:33000`

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
   ```

3. **Check server status:**
   ```bash
   ./status-background.sh
   ```

4. **Stop both servers:**
   ```bash
   ./stop-background.sh
   ```

**Note**: The script automatically sets `NODE_ENV`:
- Development mode (default): `NODE_ENV=development` - more permissive, allows curl/Postman
- Production mode (`--prod`): `NODE_ENV=production` - strict security, blocks direct API access

### What the scripts do:

- **`start-background.sh`** (Linux/macOS only)
  - Starts both backend and frontend servers in the background using `nohup`
  - Saves process IDs to `server.pids` for easy management
  - Logs output to `logs/backend.log` and `logs/frontend.log`
  - Checks if servers are already running before starting

- **`stop-background.sh`** (Linux/macOS only)
  - Stops both servers by their saved process IDs
  - Also checks and kills any processes using ports 33000 and 33001
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
   ngrok http 33000
   ```
4. Share the ngrok URL (e.g., `https://abc123.ngrok.io`) with others

**Note:** The frontend proxy needs to know the backend URL. Set environment variable:
```bash
VITE_API_URL=http://your-ngrok-backend-url:33001 npm run dev:frontend
```

### Option 2: Local Network Access

To allow access from other devices on your local network:

1. Find your local IP address:
   - **macOS/Linux**: `ifconfig | grep "inet "` or `ip addr show`
2. Start the servers (they now listen on `0.0.0.0` by default)
3. Access from other devices using: `http://YOUR_IP_ADDRESS:33000`
   - Example: `http://192.168.1.100:33000`

**Security Note:** Make sure your firewall allows connections on ports 33000 and 33001.

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
PORT=33001
HOST=0.0.0.0
NODE_ENV=production
```

For the frontend, set:
```env
VITE_API_URL=https://your-backend-url.com
```

### Option 4: Self-Hosted with Port Forwarding

1. Configure your router to forward ports 33000 (frontend) and 33001 (backend) to your machine
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
- **Automatic IP Support**: By default, any origin on port 33000 is allowed (works with IP addresses automatically)
- **Localhost Binding**: By default, backend binds to `127.0.0.1` (localhost only), preventing network access

**How It Works:**
- ✅ **No configuration needed for IP addresses!** If you access the frontend via `http://192.168.1.100:33000`, it will automatically work
- ✅ The system allows any origin on port 33000 (the frontend port) by default
- ✅ You can still explicitly set `FRONTEND_URL` for production domains
- ✅ Direct API access (e.g., `curl http://localhost:33001/api/campaigns`) is blocked

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
   FRONTEND_URLS=http://localhost:33000,https://your-frontend-domain.com npm run start:backend
   ```

4. **Strict Mode** (only explicitly allowed origins):
   ```bash
   # Disable automatic port 33000 allowance (more restrictive)
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

## License

ISC

