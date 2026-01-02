# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-19

### Added
- **Question Editing Feature**: Users can now edit their own questions
  - Edit button (✎) appears on questions created by the current user
  - Inline editing with save (✓) and cancel (×) buttons
  - Keyboard shortcuts: Enter to save, Esc to cancel
  - Visual "(edited)" badge for questions that have been modified
  - Real-time updates via Server-Sent Events (SSE)
  - Questions can be edited even after receiving votes
  - Editing only available for active campaigns (not closed campaigns)
- **Database Schema Updates**:
  - Added `user_id` column to questions table to track question creator
  - Added `updated_at` column to questions table to track edit timestamps
  - Automatic migration for existing databases
- **API Endpoint**: `PATCH /api/questions/:id` for updating questions
  - Authorization: Only question creator can edit their questions
  - Validation: Requires question text and user_id
  - Campaign status check: Prevents editing in closed campaigns
- **Frontend Enhancements**:
  - Updated `QuestionCard` component with edit functionality
  - Added `updateQuestion()` method to API service
  - Enhanced `QuestionPanel` to handle `question_updated` SSE events
  - New CSS styles for edit mode and edited badge

### Changed
- Question creation now stores `user_id` to enable editing
- Question creation now validates campaign status (cannot add to closed campaigns)

### Tests
- Added 6 new tests for question editing functionality
- All 27 tests passing
- Test coverage: 77.9% for questions route

---

## [1.0.0] - 2024-11-XX

### Added
- **Initial Release**: Townhall Q&A Poll application
- **Campaign Management**:
  - Create, view, list, close, and delete campaigns
  - Campaign creator permissions for delete/close operations
  - Campaign status tracking (active/closed)
  - Campaign timestamps (created, last updated)
- **Question Management**:
  - Create questions for campaigns
  - View questions sorted by vote count
  - Delete questions (campaign creator only)
  - Real-time question updates via SSE
- **Voting System**:
  - Upvote/downvote questions (toggle)
  - Vote count tracking
  - Real-time vote updates via SSE
  - Vote status checking
- **User Management**:
  - Automatic user ID generation and persistence
  - LocalStorage-based user tracking
- **Real-time Updates**:
  - Server-Sent Events (SSE) for live updates
  - Automatic question list refresh on changes
  - Vote count updates without page refresh
- **Frontend Features**:
  - React-based user interface
  - Responsive design
  - Question ranking animations
  - Vote animations and feedback
  - Campaign status indicators
  - Development/Production mode indicators
- **Backend API**:
  - RESTful API with Express.js
  - SQLite database
  - CORS support
  - Error handling middleware
  - Origin validation middleware
- **Deployment Options**:
  - Development mode (Vite dev server with hot reload)
  - Production mode (built frontend with Vite preview)
  - PM2 process management support
  - Background script support (nohup)
  - Configurable Vite proxy for API calls
- **Browser Restrictions**:
  - Configurable browser allowlist
  - Session-only override prompts for non-allowed browsers
- **Database Backup System**:
  - Manual backup script (`backup-db.sh`)
  - Restore script (`restore-db.sh`)
  - Automated backup setup with cron (`setup-backup-cron.sh`)
  - Backup compression and retention policies
  - Database integrity verification
- **Testing Infrastructure**:
  - Jest for backend testing (21 tests)
  - Vitest for frontend testing (22 tests)
  - Test coverage reporting
  - In-memory test database
- **Documentation**:
  - Comprehensive README with setup instructions
  - API documentation
  - Deployment guides
  - Testing documentation
  - Backup and restore documentation

### Technical Details
- **Backend**: Node.js, Express.js, SQLite3
- **Frontend**: React 18, Vite
- **Real-time**: Server-Sent Events (SSE)
- **Process Management**: PM2 support
- **Testing**: Jest, Vitest, React Testing Library
- **Version**: 1.0.0

---

## Version History

- **1.1.0** - Question editing feature
- **1.0.0** - Initial release

---

## Versioning Guide

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes that require migration or API changes
- **MINOR** (x.Y.0): New features that are backward compatible
- **PATCH** (x.y.Z): Bug fixes and small improvements

### Examples:
- `1.0.0 → 2.0.0`: Breaking database schema change, API endpoint removal
- `1.0.0 → 1.1.0`: New feature (question editing, new endpoint)
- `1.1.0 → 1.1.1`: Bug fix, documentation update, small improvement
