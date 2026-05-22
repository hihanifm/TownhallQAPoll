import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const portsConfigPath = resolve(__dirname, '../config/ports.json')
const portsConfig = JSON.parse(readFileSync(portsConfigPath, 'utf8'))
const devPorts = portsConfig.dev || {}

const devFrontendPort = Number(process.env.FRONTEND_PORT) || Number(devPorts.frontend) || portsConfig.frontend
const devBackendPort = Number(process.env.PORT) || Number(process.env.BACKEND_PORT) || Number(devPorts.backend) || portsConfig.backend
const previewFrontendPort = Number(process.env.FRONTEND_PORT) || portsConfig.frontend

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow remote access
    port: devFrontendPort,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || `http://localhost:${devBackendPort}`,
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
    port: previewFrontendPort
  }
})

