#!/bin/bash

# QuizMaster Production Start Script
# Combined frontend and backend deployment

set -e

echo "🚀 Starting QuizMaster Production Deployment..."

# Set production environment
export NODE_ENV=production

# Navigate to application directory
cd /var/www/quiz-platform/backend

# Verify frontend files are in place
if [ ! -f "public/index.html" ]; then
    echo "❌ Frontend files not found in public directory"
    echo "Run: rsync -av ../frontend/ public/"
    exit 1
fi

# Install/update dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Create necessary directories
mkdir -p logs uploads/temp

# Set correct permissions
chmod +x github-manager.sh
chmod +x deploy.sh

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start with PM2
echo "▶️ Starting QuizMaster with PM2..."
pm2 start ecosystem.config.js

# Show status
pm2 status

echo ""
echo "✅ QuizMaster started successfully!"
echo ""
echo "🌐 Application available at:"
echo "   - Frontend: http://localhost:3002"
echo "   - API: http://localhost:3002/api"
echo "   - Socket.IO: ws://localhost:3002"
echo ""
echo "📊 Monitor with:"
echo "   pm2 status"
echo "   pm2 logs quiz-master"
echo "   pm2 monit"
echo ""
echo "🔄 Update from GitHub:"
echo "   ./github-manager.sh deploy"
echo ""
