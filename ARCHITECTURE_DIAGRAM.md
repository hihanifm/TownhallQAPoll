# Architecture Diagram

This directory contains an Excalidraw-compatible architecture diagram for the Townhall Q&A Poll application.

## How to Use

1. **Open in Excalidraw:**
   - Go to [excalidraw.com](https://excalidraw.com)
   - Click "Open" or use the menu
   - Select "Open from file"
   - Choose `architecture-diagram.excalidraw`

2. **Or use Excalidraw Desktop App:**
   - Download from [excalidraw.com](https://excalidraw.com)
   - Open the `.excalidraw` file directly

## Diagram Overview

The diagram shows the complete architecture of the Townhall Q&A Poll application:

### Frontend Layer (React)
- **App.jsx** - Main component with browser detection
- **CampaignList.jsx** - Campaign management with SSE
- **QuestionPanel.jsx** - Question display with real-time updates
- **QuestionCard.jsx** - Individual question display
- **CreateQuestionForm.jsx** - Question submission
- **api.js** - API client service
- **localStorage** - Anonymous user ID storage

### Backend Layer (Express)
- **server.js** - Express server (Port 33001)
- **routes/campaigns.js** - Campaign CRUD operations
- **routes/questions.js** - Question management
- **routes/votes.js** - Voting functionality
- **routes/sse.js** - Server-Sent Events for real-time updates
- **services/sseService.js** - SSE service implementation
- **db/database.js** - SQLite connection

### Database Layer (SQLite)
- **campaigns** table - Campaign storage
- **questions** table - Question storage
- **votes** table - Vote tracking with duplicate prevention

### Communication
- **HTTP/REST** - Standard API calls (solid arrow)
- **SSE** - Server-Sent Events for real-time updates (dashed red arrow)
- **SQL** - Database queries (solid arrow)

## Features Highlighted

- Real-time updates via Server-Sent Events (SSE)
- Anonymous voting using localStorage-generated user IDs
- Top 5 question ranking system
- Campaign management (create, close, delete)
- Question submission and voting
- Duplicate vote prevention
