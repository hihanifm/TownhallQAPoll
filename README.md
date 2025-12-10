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

- Node.js (v16 or higher)
- npm or yarn

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

