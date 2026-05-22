# Multi-stage build for Townhall Q&A Poll

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build-time environment variables
ARG VITE_ENABLE_BROWSER_RESTRICTION=true
ENV VITE_ENABLE_BROWSER_RESTRICTION=$VITE_ENABLE_BROWSER_RESTRICTION

# Build frontend
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# Expose port
EXPOSE 33111

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=33111

# Run backend server
CMD ["node", "backend/src/server.js"]
