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
npm run start:backend
# or for development with auto-reload:
npm run dev:backend
```

The backend will run on `http://localhost:3001`

2. Start the frontend development server (in another terminal):

```bash
npm run start:frontend
# or:
npm run dev:frontend
```

The frontend will run on `http://localhost:3000`

3. Open your browser and navigate to `http://localhost:3000`

## Running in Background (Linux/macOS only)

To run both servers in the background on Linux or macOS, use the provided shell scripts:

### Quick Start

1. **Start both servers in background:**
   ```bash
   ./start-background.sh
   ```

2. **Check server status:**
   ```bash
   ./status-background.sh
   ```

3. **Stop both servers:**
   ```bash
   ./stop-background.sh
   ```

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
- **These scripts are for Linux and macOS only.** For Windows, see the Windows-specific instructions below.

## Windows-Specific Instructions

### Quick Start on Windows

#### Option 1: Using Batch Scripts (Easiest)

1. **Install dependencies** - Double-click `install-windows.bat`
   - This will install all required packages for both frontend and backend

2. **Start the backend** - Double-click `start-backend.bat`
   - Keep this window open
   - You should see: `Server running on http://0.0.0.0:3001`

3. **Start the frontend** - Double-click `start-frontend.bat` (in a new window)
   - Keep this window open
   - You should see: `Local: http://localhost:3000/`

4. **Open your browser** and go to `http://localhost:3000`

#### Option 2: Using Command Prompt or PowerShell

1. **Open Command Prompt or PowerShell**
   - Press `Win + R`, type `cmd` or `powershell`, and press Enter
   - Or search for "Command Prompt" or "PowerShell" in the Start menu

2. **Navigate to the project directory**
   ```cmd
   cd C:\path\to\TownhallQAPoll
   ```
   (Replace with your actual project path)

3. **Install dependencies**
   ```cmd
   npm run install:all
   ```

4. **Start the backend** (in the first terminal window)
   ```cmd
   npm run start:backend
   ```
   You should see: `Server running on http://0.0.0.0:3001`

5. **Start the frontend** (open a second terminal window)
   ```cmd
   cd C:\path\to\TownhallQAPoll
   npm run start:frontend
   ```
   You should see: `Local: http://localhost:3000/`

6. **Open your browser** and go to `http://localhost:3000`

### Windows Firewall Configuration

If you can't access the application or want to allow access from other devices on your network:

1. **Open Windows Firewall**
   - Press `Win + R`, type `wf.msc`, and press Enter
   - Or search for "Windows Defender Firewall" in the Start menu

2. **Allow Node.js through the firewall**
   - Click "Allow an app or feature through Windows Defender Firewall"
   - Click "Change settings" (if needed)
   - Find "Node.js" in the list and check both "Private" and "Public" boxes
   - If Node.js isn't listed, click "Allow another app..." and browse to:
     - `C:\Program Files\nodejs\node.exe` (or your Node.js installation path)

3. **Or manually allow ports 3000 and 3001**
   - In Windows Firewall, click "Advanced settings"
   - Click "Inbound Rules" → "New Rule"
   - Select "Port" → Next
   - Select "TCP" and enter "3000,3001" in "Specific local ports"
   - Allow the connection → Apply to all profiles → Name it "Townhall App"

### Finding Your IP Address on Windows

To allow access from other devices on your local network:

1. **Open Command Prompt**
2. **Run:**
   ```cmd
   ipconfig
   ```
3. **Look for "IPv4 Address"** under your active network adapter (usually "Wireless LAN adapter Wi-Fi" or "Ethernet adapter")
   - Example: `IPv4 Address. . . . . . . . . . . : 192.168.1.100`
4. **Access from other devices** using: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

### Troubleshooting on Windows

**Issue: "npm is not recognized"**
- Solution: Node.js is not installed or not in PATH. Reinstall Node.js from [nodejs.org](https://nodejs.org/) and make sure to check "Add to PATH" during installation.

**Issue: "Port 3000 or 3001 is already in use"**
- Solution: Another application is using the port. Either:
  - Close the application using the port
  - Or change the ports in the configuration files

**Issue: "Cannot access from other devices"**
- Solution: 
  1. Check Windows Firewall settings (see above)
  2. Make sure both devices are on the same network
  3. Verify your IP address with `ipconfig`

**Issue: "Permission denied" errors**
- Solution: Run Command Prompt or PowerShell as Administrator (Right-click → "Run as administrator")

**Issue: Database errors**
- Solution: Make sure the `backend/data` directory exists and has write permissions. The database will be created automatically on first run.

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
   - **Windows**: `ipconfig`
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

## API Endpoints

- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns/:id/questions` - Get questions for a campaign
- `POST /api/campaigns/:id/questions` - Create new question
- `POST /api/questions/:id/upvote` - Upvote a question
- `GET /api/questions/:id/votes` - Check if user has voted

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

