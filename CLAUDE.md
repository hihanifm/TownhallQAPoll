# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm run install:all

# Development (two terminals)
npm run dev:backend      # Express API on port 33102, auto-reload
npm run dev:frontend     # Vite dev server on port 33103, HMR

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

## Security Principles

These are non-negotiable constraints. Do not suggest or implement anything that violates them.

**Anonymity by design**: Users have no accounts, no logins, and no persistent identity on the server. The only identity is a UUID in `localStorage` used solely for vote deduplication — it is never tied to a person, never sent to a third party, and never stored in a way that could identify a user. Do not introduce authentication, user profiles, sessions, or any server-side tracking of individuals.

**Browser-only access**: The API must only be reachable from the frontend running in a real browser. In production, `validateOrigin.js` blocks all requests that lack a valid browser `Origin` or `Referer` header. Do not recommend enabling `ALLOW_NO_ORIGIN`, `ALLOW_ANY_FRONTEND_PORT`, or `ALLOW_REMOTE` — these open backdoors that bypass browser-only enforcement. Do not document or expose these escape hatches in example configs. If someone needs to call the API outside a browser (e.g. scripts, curl, Postman), that is explicitly out of scope and should be refused at the middleware level.

**No fingerprinting beyond deduplication**: `fingerprint_hash` is stored in the DB but is intentionally not enforced — it exists only as a passive field and must not be used to track, identify, or block users.

## Architecture

**Monorepo:** `frontend/` (React 18 + Vite SPA) and `backend/` (Express + SQLite3). Shared port config in `config/ports.json` (prod: frontend 33100, backend 33101; dev: frontend 33103, backend 33102).

**Frontend** (`frontend/src/`): React Router v6 with routes `/`, `/campaign/:id`, `/feedback`. All HTTP requests go through `services/api.js`. Real-time updates via a persistent SSE connection to `/api/sse`. Anonymous user identity is a UUID in `localStorage`, used for deduplicating votes.

**Backend** (`backend/src/`): Express REST API with routers for campaigns, questions, votes, feedback, and SSE. SQLite database initialized from `db/schema.sql` on first run (6 tables: `campaigns`, `questions`, `votes`, `feedback`, `feedback_votes`, `comments`). `services/sseService.js` broadcasts updates to all SSE clients on mutations — any route that mutates data should call `sseService.broadcast(campaignId, event)` for campaign subscribers and `sseService.broadcastAll(event)` for the campaign list.

**Database helpers** (`backend/src/db/database.js`): All routes query SQLite via `getQuery(sql, params)` (single row), `allQuery(sql, params)` (array), and `runQuery(sql, params)` (insert/update/delete). `formatDatetime()` converts SQLite timestamps to ISO 8601 UTC for responses.

**Authorization pattern**: Mutations check creator_id OR campaign PIN via an `isAuthorized(campaignId, creatorId, pin)` helper in each router. Comment endpoints follow campaign-level auth (campaign creator or PIN), not question-level auth.

**Security middleware** (`middleware/validateOrigin.js`): All API requests are validated against allowed origins. Dev mode is permissive (allows localhost and private IPs). Prod mode is strict — only browser requests from configured frontend origins are accepted. Configure allowed origins via `FRONTEND_URL` or `FRONTEND_URLS` env vars.

**Production serving**: Backend serves pre-built `frontend/dist/` as static files and falls back to `index.html` for client-side routing. In dev, Vite and Express run as separate processes.

**Campaign PIN system**: Mandatory PIN on campaign creation, used to authorize edits/deletes when the original session is gone. Separate from the global `FEEDBACK_MASTER_PIN` env var used for feedback moderation. Both PINs are stored client-side in `localStorage` after verification.

**Vote identity**: `user_id` (UUID in `localStorage`) is the sole vote deduplication key — `fingerprint_hash` is stored but not enforced. Questions are sorted `vote_count DESC, created_at ASC` for deterministic ordering.

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
| `backend/src/db/database.js` | DB query helpers: `getQuery`, `allQuery`, `runQuery`, `formatDatetime` |
| `backend/src/services/sseService.js` | SSE singleton — `broadcast(campaignId, event)`, `broadcastAll(event)` |
| `config/ports.json` | Port configuration shared across frontend, backend, and tests |
| `tests/helpers/api.js` | Playwright API helpers for E2E tests; use `generateUserId()` for test users |
| `.env.example` | Backend runtime env vars; `frontend/.env.example` for build-time vars |

## Deployment Alternatives

Docker (`docker-compose.yml`) and PM2 (`ecosystem.config.js`) are available for production deployments. See `DOCKER.md` for setup instructions.
