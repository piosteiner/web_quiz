module.exports = {
  apps: [{
    name: 'quiz-backend',
    script: 'src/app.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3002,
      LOG_LEVEL: 'debug'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002,
      LOG_LEVEL: 'info'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced PM2 features
    instance_var: 'INSTANCE_ID',
    source_map_support: false,
    
    // Health monitoring
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Environment-specific settings
    node_args: process.env.NODE_ENV === 'production' 
      ? ['--max-old-space-size=1024'] 
      : ['--inspect']
  }],

  deploy: {
    production: {
      user: 'ubuntu',
      host: process.env.DEPLOY_HOST || 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/quiz-master.git',
      cwd: '/var/www/quiz-platform/backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};
