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
- **App.jsx** - Main component, routing, SSE connection, browser restriction
- **CampaignList.jsx** - Campaign list with SSE-driven real-time updates
- **QuestionPanel.jsx** - Question display with PIN verification and campaign close
- **QuestionCard.jsx** - Individual question with vote, edit, delete, comments
- **CreateQuestionForm.jsx** - Question submission
- **FeedbackPanel.jsx** - Feedback board with voting and moderation
- **FeedbackCard.jsx** - Individual feedback item
- **CreateFeedbackForm.jsx** - Feedback submission
- **PinEntryModal.jsx** - Campaign PIN entry
- **FeedbackPinModal.jsx** - Feedback moderation PIN entry
- **api.js** - All frontend HTTP calls
- **localStorage** - Anonymous user UUID, verified PINs

### Backend Layer (Express)
- **server.js** - Express server (Port 33101 prod, 33102 dev)
- **middleware/validateOrigin.js** - Origin validation; permissive in dev, strict in prod
- **routes/campaigns.js** - Campaign CRUD + PIN verification
- **routes/questions.js** - Question management + comments
- **routes/votes.js** - Vote toggling
- **routes/feedback.js** - Feedback CRUD + moderation
- **routes/sse.js** - SSE subscription handler
- **services/sseService.js** - SSE singleton; `broadcast(campaignId)` + `broadcastAll()`
- **db/database.js** - SQLite helpers (`getQuery`, `allQuery`, `runQuery`)

### Database Layer (SQLite)
- **campaigns** table - Campaign storage (title, status, creator PIN)
- **questions** table - Question storage (text, creator, moderator flag)
- **votes** table - Vote tracking; UNIQUE(question_id, user_id)
- **comments** table - Moderator comments on questions
- **feedback** table - General feedback submissions (open/closed status)
- **feedback_votes** table - Feedback upvotes; UNIQUE(feedback_id, user_id)

### Communication
- **HTTP/REST** - Standard API calls (solid arrow)
- **SSE** - Server-Sent Events for real-time updates (dashed red arrow)
- **SQL** - Database queries (solid arrow)

## Features Highlighted

- Real-time updates via Server-Sent Events (SSE) — per-campaign channels
- Anonymous voting using localStorage-generated UUIDs (user_id is sole vote identity)
- Question ranking: sorted by vote_count DESC, created_at ASC
- Campaign management (create with mandatory PIN, close, delete)
- Campaign PIN system: creator_id OR PIN grants edit/delete access
- Comments: moderators can annotate questions (campaign-level auth)
- Feedback channel: separate from campaigns, with global moderation PIN
- Automatic daily SQLite backups with 7-day retention
