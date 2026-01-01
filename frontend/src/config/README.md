# Frontend Configuration

## API Configuration (`apiConfig.js`)

Controls how the frontend communicates with the backend API.

### Configuration Options

#### Environment Variables

Create a `.env` file in the `frontend/` directory (or set environment variables):

**`VITE_USE_PROXY`** (default: `true`)
- `true` or not set: Use Vite as reverse proxy (recommended for development)
- `false`: Frontend makes direct API calls to backend

**`VITE_API_URL`** (default: `http://localhost:3001`)
- Backend API URL (only used when `VITE_USE_PROXY=false`)
- Can be set to any backend URL (e.g., `http://192.168.1.100:3001`, `https://api.example.com`)

### Usage Modes

#### Mode 1: Vite Proxy (Default - Recommended for Development)

```bash
# .env file (or no .env - defaults to proxy mode)
VITE_USE_PROXY=true
# or just don't set it (defaults to true)
```

**How it works:**
- Frontend makes requests to `/api/*`
- Vite dev server proxies these to the backend
- No CORS issues
- Origin headers are preserved for backend validation

**Example:**
```javascript
// Frontend code calls: fetch('/api/campaigns')
// Vite proxies to: http://localhost:3001/api/campaigns
```

#### Mode 2: Direct Backend Calls

```bash
# .env file
VITE_USE_PROXY=false
VITE_API_URL=http://localhost:3001
```

**How it works:**
- Frontend makes direct requests to backend URL
- No proxy involved
- Requires CORS to be properly configured on backend
- Useful for production deployments where frontend and backend are on different domains

**Example:**
```javascript
// Frontend code calls: fetch('/api/campaigns')
// Actually calls: http://localhost:3001/api/campaigns
```

### Production Builds

For production builds, the configuration is baked in at build time:

```bash
# Build with proxy enabled (default)
npm run build

# Build with direct backend calls
VITE_USE_PROXY=false VITE_API_URL=https://api.example.com npm run build
```

### Examples

#### Development with Proxy (Default)
```bash
# No .env needed - works out of the box
npm run dev
```

#### Development with Direct Calls
```bash
# Create frontend/.env
echo "VITE_USE_PROXY=false" > frontend/.env
echo "VITE_API_URL=http://localhost:3001" >> frontend/.env

npm run dev
```

#### Production Build with Direct Calls
```bash
# Build for production with direct backend calls
VITE_USE_PROXY=false \
VITE_API_URL=https://api.yourdomain.com \
npm run build
```

### Notes

- **SSE (Server-Sent Events)**: Also respects the proxy configuration
- **CORS**: When using direct calls, ensure backend CORS is configured to allow your frontend origin
- **Environment Variables**: Must be prefixed with `VITE_` to be accessible in the frontend code
- **Build Time**: Configuration is determined at build time, not runtime
