import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const portsConfigPath = resolve(__dirname, '../config/ports.json')
const portsConfig = JSON.parse(readFileSync(portsConfigPath, 'utf8'))

const frontendPort = Number(process.env.FRONTEND_PORT) || portsConfig.frontend
const backendPort = Number(process.env.PORT) || Number(process.env.BACKEND_PORT) || portsConfig.backend

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow remote access
    port: frontendPort,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || `http://localhost:${backendPort}`,
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
    port: frontendPort
  }
})

