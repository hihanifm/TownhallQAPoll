# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm run install:all

# Development (two terminals)
npm run dev:backend      # Express API on port 33101, auto-reload
npm run dev:frontend     # Vite dev server on port 33100, HMR

# Or run both in background (macOS/Linux)
./start-background.sh
./stop-background.sh

# Production
npm run start:prod       # Builds frontend then starts backend serving static files

# E2E tests (requires servers running)
npm run test:e2e
npm run test:e2e:ui      # with Playwright UI
npx playwright test tests/e2e/campaign-voting.spec.js  # single test file

# Agent-browser tests
npm run test:agent-browser
```

No unit tests or linting configured — testing is exclusively E2E via Playwright.

## Architecture

**Monorepo:** `frontend/` (React 18 + Vite SPA) and `backend/` (Express + SQLite3). Shared port config in `config/ports.json` (frontend: 33100, backend: 33101).

**Frontend** (`frontend/src/`): React Router v6 with routes `/`, `/campaign/:id`, `/feedback`. All HTTP requests go through `services/api.js`. Real-time updates via a persistent SSE connection to `/api/sse`. Anonymous user identity is a UUID in `localStorage`, used for deduplicating votes.

**Backend** (`backend/src/`): Express REST API with routers for campaigns, questions, votes, feedback, and SSE. SQLite database initialized from `db/schema.sql` on first run (5 tables: `campaigns`, `questions`, `votes`, `feedback`, `comments`). `services/sseService.js` broadcasts updates to all SSE clients on mutations.

**Security middleware** (`middleware/validateOrigin.js`): All API requests are validated against allowed origins. Dev mode is permissive (allows localhost, private IPs, no-origin requests from tools like curl). Prod mode is strict — only configured frontend origins are accepted. Configured via env vars: `FRONTEND_URL`, `FRONTEND_URLS`, `ALLOW_ANY_FRONTEND_PORT`, `ALLOW_NO_ORIGIN`.

**Production serving**: Backend serves pre-built `frontend/dist/` as static files and falls back to `index.html` for client-side routing. In dev, Vite and Express run as separate processes.

**Campaign PIN system**: Optional PIN protection on campaigns, separate from the global `FEEDBACK_MASTER_PIN` env var used for feedback moderation access.

**Backup service**: Auto-daily SQLite backups at midnight via node-cron, stored in `backend/data/backups/`.

**Optional browser restriction**: Build-time `VITE_ENABLE_BROWSER_RESTRICTION` env var restricts access to specific browsers (User-Agent based). Always off in dev.

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Express app setup, middleware, router registration |
| `backend/src/middleware/validateOrigin.js` | Origin validation security layer |
| `backend/src/db/schema.sql` | SQLite schema (authoritative) |
| `frontend/src/App.jsx` | Root component, routing, SSE connection, browser restriction |
| `frontend/src/services/api.js` | All frontend HTTP calls |
| `config/ports.json` | Port configuration shared across frontend, backend, and tests |
| `.env.example` | All supported environment variables |
