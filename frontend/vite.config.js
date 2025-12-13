import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow remote access
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
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
    }
  },
  preview: {
    host: '0.0.0.0', // Allow remote access
    port: 3000
  }
})

