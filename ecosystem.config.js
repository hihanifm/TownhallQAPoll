module.exports = {
  apps: [
    {
      name: 'townhall-backend',
      script: './start-pm2.sh',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      // Default environment (used when no --env flag is specified)
      // Backend wrapper script (start-pm2.sh) will use 'npm run start' in development, 'npm run start:prod' in production
      // Default is DEVELOPMENT
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: '127.0.0.1', // Default to localhost for security
      },
      // Development environment (use with: pm2 start ecosystem.config.js --env development)
      // Backend will run 'npm run start' (node src/server.js)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: '127.0.0.1',
      },
      // Production environment (use with: pm2 start ecosystem.config.js --env production)
      // Backend will run 'npm run start:prod' (NODE_ENV=production node src/server.js)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
      },
      // Auto-restart settings
      autorestart: true,
      watch: false, // Disable watch in production
      max_memory_restart: '500M',
      
      // Logging
      error_file: './logs/pm2-backend-error.log',
      out_file: './logs/pm2-backend-out.log',
      log_file: './logs/pm2-backend.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart settings
      min_uptime: '60s', // App must run for 60 seconds to be considered stable
      max_restarts: 5, // Will try 5 times before giving up
      restart_delay: 4000,
      exp_backoff_restart_delay: 100, // Exponential backoff: delays increase with each restart
      listen_timeout: 10000, // Wait 10s for app to start listening
      kill_timeout: 5000, // Wait 5s for graceful shutdown
    },
    {
      name: 'townhall-frontend',
      script: './start-pm2.sh',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      // Default environment (used when no --env flag is specified)
      // Frontend wrapper script (start-pm2.sh) will use 'dev' in development, 'preview' in production
      // Default is DEVELOPMENT
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        VITE_USE_PROXY: 'true', // Use Vite proxy in development
        VITE_API_URL: 'http://localhost:3001',
      },
      // Development environment (use with: pm2 start ecosystem.config.js --env development)
      // Frontend will run 'npm run dev' (Vite dev server with hot reload)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        VITE_USE_PROXY: 'true', // Use Vite proxy in development
        VITE_API_URL: 'http://localhost:3001',
      },
      // Production environment (use with: pm2 start ecosystem.config.js --env production)
      // Frontend will run 'npm run preview' (serves built files)
      // Note: Frontend must be built first: npm run build:frontend
      // Uses direct backend calls (no proxy) - DEFAULT for production
      // Matches: ./start-background.sh --prod (default: no proxy)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        VITE_USE_PROXY: 'false', // Direct backend calls in production (default)
        VITE_API_URL: 'http://localhost:3001',
      },
      // Production with proxy (use with: pm2 start ecosystem.config.js --env production_proxy)
      // Uses Vite proxy in production - OPTIONAL
      // Matches: ./start-background.sh --prod --vite-proxy
      env_production_proxy: {
        NODE_ENV: 'production',
        PORT: 3000,
        VITE_USE_PROXY: 'true', // Use Vite proxy in production (optional)
        VITE_API_URL: 'http://localhost:3001',
      },
      // Auto-restart settings
      autorestart: true,
      watch: false, // Disable watch in production
      max_memory_restart: '300M',
      
      // Logging
      error_file: './logs/pm2-frontend-error.log',
      out_file: './logs/pm2-frontend-out.log',
      log_file: './logs/pm2-frontend.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart settings
      min_uptime: '60s', // App must run for 60 seconds to be considered stable
      max_restarts: 5, // Will try 5 times before giving up
      restart_delay: 4000,
      exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms
      listen_timeout: 10000, // Wait 10s for app to start listening
      kill_timeout: 5000, // Wait 5s for graceful shutdown
      
      // Wait for backend to be ready
      wait_ready: false,
    }
  ]
};
