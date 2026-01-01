module.exports = {
  apps: [
    {
      name: 'townhall-backend',
      script: './backend/src/server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1', // Default to localhost for security
      },
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
      script: 'npm',
      args: 'run preview',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        VITE_USE_PROXY: 'false', // Direct backend calls in production
        VITE_API_URL: 'http://localhost:3001',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        VITE_USE_PROXY: 'false',
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
