/**
 * API Configuration
 * 
 * Controls how the frontend communicates with the backend API
 */

// Check if we should use Vite proxy (default: true for development)
// Set VITE_USE_PROXY=false to disable proxy and use direct backend calls
const USE_PROXY = import.meta.env.VITE_USE_PROXY !== 'false';

// Backend API URL (used when proxy is disabled)
// Defaults to http://localhost:3001, but can be overridden via VITE_API_URL
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Base URL for API calls
// If using proxy: '/api' (relative, goes through Vite proxy)
// If not using proxy: full backend URL + '/api'
export const API_BASE_URL = USE_PROXY ? '/api' : `${BACKEND_URL}/api`;

// Base URL for SSE connections
export const SSE_BASE_URL = USE_PROXY ? '/api/sse' : `${BACKEND_URL}/api/sse`;

// Export configuration info for debugging
export const apiConfig = {
  useProxy: USE_PROXY,
  backendUrl: BACKEND_URL,
  apiBaseUrl: API_BASE_URL,
  sseBaseUrl: SSE_BASE_URL,
};

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('API Configuration:', apiConfig);
}
