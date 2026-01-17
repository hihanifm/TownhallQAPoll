module.exports = {
  apps: [
    {
      name: 'townhall-backend',
      script: 'backend/src/server.js',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      
      // Auto-restart settings
      autorestart: true,
      
      // Memory limit - restart if memory exceeds 500MB
      max_memory_restart: '500M',
      
      // Unstable restart limits
      max_restarts: 10,
      min_uptime: '60s',
      
      // Restart delays
      restart_delay: 60000, // 60 seconds
      exp_backoff_restart_delay: 60000, // 60 seconds
      
      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0', // Bind to all interfaces
        PORT: 33001
      },
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Watch disabled for production
      watch: false
    }
  ]
};
