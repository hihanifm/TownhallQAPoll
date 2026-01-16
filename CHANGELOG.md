# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added
- Initial release of Townhall Q&A Poll Application
- Campaign management system for moderators to create and manage polls
- Anonymous question submission for employees
- Upvoting system with duplicate prevention (one vote per user per question)
- Top 5 question ranking display
- Real-time updates using Server-Sent Events (SSE)
- Browser detection and restriction system (configurable)
- Anonymous user ID management using localStorage
- SQLite database for persistent storage
- RESTful API with CORS and origin validation
- Development and production modes with different security settings
- Cross-platform setup scripts (Windows batch files, Linux/macOS shell scripts)
- Background server management scripts
- Comprehensive README documentation
- Architecture diagram documentation

### Features
- **Frontend**: React 18 with Vite
- **Backend**: Node.js with Express
- **Database**: SQLite (file-based)
- **Real-time**: Server-Sent Events for live updates
- **Security**: Origin validation, CORS protection, development/production modes
