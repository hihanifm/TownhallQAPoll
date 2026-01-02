# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2024-12-19

### Fixed
- CORS: Cache preflight requests for 24 hours to reduce OPTIONS requests

## [1.1.0] - 2024-12-19

### Added
- Question editing: Users can edit their own questions
- Database: Added `user_id` and `updated_at` columns to questions table
- API: `PATCH /api/questions/:id` endpoint for question updates
- Frontend: Edit button, inline editing, "(edited)" badge

### Changed
- Question creation now stores `user_id` and validates campaign status

---

## [1.0.0] - 2024-11-XX

### Added
- Campaign management (create, view, close, delete)
- Question submission and voting
- Real-time updates via SSE
- PM2 and background script deployment options
- Database backup system
- Testing infrastructure (Jest, Vitest)
- Browser restriction support

---

## Version History

- **1.1.1** - CORS optimization
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
