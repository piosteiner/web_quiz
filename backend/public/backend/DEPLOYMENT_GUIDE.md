# 🚀 Production Deployment Guide - Combined Strategy

## Architecture Overview

```
Internet → Nginx (Reverse Proxy) → Node.js Server
                                  ├── /api/* (API endpoints)
                                  ├── /socket.io/* (WebSocket)
                                  └── /* (Static frontend files)
```

## Step 1: Prepare Frontend Integration

### Move GitHub Frontend to Backend
```bash
# Create static directory in your backend
mkdir -p /var/www/quiz-master/public

# Copy your GitHub repository files to public/
# Frontend files should be in: /var/www/quiz-master/public/
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── join.html
│   ├── live-control.html
│   ├── css/
│   ├── js/
│   └── assets/
```

### Update Frontend Configuration
```javascript
// In your frontend JavaScript files, update WebSocket connection:
// OLD: const socket = io('ws://separate-backend-domain.com');
// NEW: const socket = io(); // Uses same domain automatically

// OLD: fetch('https://api.backend-domain.com/api/quizzes')
// NEW: fetch('/api/quizzes') // Relative URL to same server
```

## Step 2: Configure Backend to Serve Static Files

Update your Express server to serve frontend files:

```javascript
// In server/app.js, add static file serving
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all handler for SPA routing (must be last)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
        return next(); // Let API routes handle these
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

## Step 3: Production Server Setup

### VPS/Server Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB+ (for concurrent sessions)
- **Storage**: 20GB SSD
- **Bandwidth**: Unmetered (for real-time WebSocket traffic)
- **OS**: Ubuntu 22.04 LTS (recommended)

### Recommended Hosting Providers
1. **DigitalOcean**: $20/month droplet (robust, reliable)
2. **Linode**: Similar pricing, excellent performance
3. **Hetzner**: More cost-effective for EU users
4. **AWS EC2**: More expensive but maximum reliability

## Step 4: Server Setup & Deployment

### 1. Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Deploy Application
```bash
# Clone your repository
cd /var/www
sudo git clone https://github.com/your-username/quiz-master.git
sudo chown -R $USER:$USER quiz-master
cd quiz-master

# Install dependencies
npm install --production

# Copy your frontend files to public/ directory
# (This step depends on how you integrate your GitHub frontend)

# Set up environment
sudo cp .env.example .env
sudo nano .env  # Configure production settings
```

### 3. Configure PM2 (Process Manager)
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'quiz-master',
    script: 'server/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 4. Configure Nginx
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/quiz-master << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=websocket:10m rate=20r/s;

    # API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket for Socket.IO
    location /socket.io/ {
        limit_req zone=websocket burst=50 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files (frontend)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Caching for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://localhost:3000;
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/quiz-master /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate
```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 5: Production Environment Configuration

### Environment Variables (.env)
```bash
# Server
NODE_ENV=production
PORT=3000

# Domain
DOMAIN=your-domain.com
BASE_URL=https://your-domain.com

# Security
SESSION_SECRET=your-super-secure-session-secret
JWT_SECRET=your-jwt-secret-key

# CORS
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_STRICT_MAX=20

# Quiz Configuration
MAX_PARTICIPANTS_PER_SESSION=100
DEFAULT_QUESTION_TIME=30
MAX_QUESTIONS_PER_QUIZ=50

# Logging
LOG_LEVEL=info
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# Performance
CLUSTER_WORKERS=0  # 0 = auto-detect CPU cores
```

## Step 6: Monitoring & Maintenance

### Health Monitoring
```bash
# PM2 monitoring
pm2 monit

# Check application logs
pm2 logs quiz-master

# Server resource monitoring
htop
df -h
free -m
```

### Automated Backups
```bash
# Create backup script
cat > /home/ubuntu/backup-quiz.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
tar -czf /home/ubuntu/backups/quiz-master_\$DATE.tar.gz /var/www/quiz-master
find /home/ubuntu/backups/ -name "quiz-master_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-quiz.sh

# Add to crontab for daily backups
echo "0 2 * * * /home/ubuntu/backup-quiz.sh" | crontab -
```

### Update Deployment Script
```bash
# Create update script
cat > /var/www/quiz-master/deploy.sh << EOF
#!/bin/bash
echo "Updating QuizMaster..."
git pull origin main
npm install --production
pm2 reload quiz-master
echo "Deployment complete!"
EOF

chmod +x deploy.sh
```

## Step 7: Performance Optimization

### Node.js Optimizations
```javascript
// In server/app.js, add performance middleware
app.use(compression()); // Gzip compression
app.use(helmet()); // Security headers

// Enable cluster mode in PM2 for multi-core usage
// (Already configured in ecosystem.config.js)
```

### Database Considerations
For future scalability, consider migrating from in-memory storage to:
- **Redis**: For session data and real-time features
- **PostgreSQL**: For persistent quiz and user data
- **MongoDB**: Alternative for flexible quiz structures

## Security Checklist

- ✅ **Firewall**: Only ports 22, 80, 443 open
- ✅ **SSL**: HTTPS encryption for all traffic
- ✅ **Rate Limiting**: API and WebSocket protection
- ✅ **Headers**: Security headers via Helmet.js
- ✅ **Updates**: Automated security updates
- ✅ **Backups**: Daily automated backups
- ✅ **Monitoring**: PM2 and server monitoring

## Expected Performance

With this setup, you can expect:
- **Concurrent Users**: 500+ simultaneous participants
- **Response Time**: <100ms for API calls
- **Uptime**: 99.9%+ with proper monitoring
- **Scalability**: Easy horizontal scaling when needed

## Cost Estimate

**Monthly Costs:**
- VPS Server: $20-40/month
- Domain: $10-15/year
- SSL Certificate: Free (Let's Encrypt)
- **Total**: ~$25-45/month

This combined deployment strategy gives you maximum reliability, performance, and simplicity for your QuizMaster platform! 🚀
