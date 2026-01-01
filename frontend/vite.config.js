import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Check if proxy should be enabled
  // Default: enabled (true) unless explicitly set to 'false'
  const useProxy = process.env.VITE_USE_PROXY !== 'false';
  const backendUrl = process.env.VITE_API_URL || 'http://localhost:3001';

  // Build proxy configuration conditionally
  const proxyConfig = useProxy ? {
    '/api': {
      target: backendUrl,
      changeOrigin: true,
      // Preserve the origin header so backend can validate it
      configure: (proxy, options) => {
        proxy.on('proxyReq', (proxyReq, req, res) => {
          // Ensure origin header is preserved from the original request
          if (req.headers.origin) {
            proxyReq.setHeader('origin', req.headers.origin);
          }
          // Also set referer if available
          if (req.headers.referer) {
            proxyReq.setHeader('referer', req.headers.referer);
          }
        });
      }
    }
  } : {};

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Allow remote access
      port: 3000,
      ...(useProxy && { proxy: proxyConfig })
    },
    preview: {
      host: '0.0.0.0', // Allow remote access
      port: 3000
    }
  }
})

