#!/bin/bash

# Quiz Backend Server Deployment Script
echo "🚀 Deploying Quiz Backend on Your Server..."

# Set up directories
BACKEND_DIR="/var/www/quiz-platform/backend"
NGINX_CONF="/etc/nginx/sites-available/quiz-backend"

cd $BACKEND_DIR

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Set up nginx configuration
echo "🌐 Setting up nginx configuration..."
sudo cp nginx-quiz-backend.conf $NGINX_CONF
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/quiz-backend

# Test nginx configuration
echo "🔍 Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration error!"
    exit 1
fi

# Start/restart the backend with PM2
echo "🔄 Starting Quiz Backend with PM2..."
pm2 start ecosystem.config.js --env production

# Show status
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "✅ Quiz Backend deployed successfully!"
echo ""
echo "🌐 Backend URL: https://quiz-backend.piogino.ch"
echo "🔍 Health Check: https://quiz-backend.piogino.ch/api/health"
echo "📊 Monitor: pm2 status"
echo "📝 Logs: pm2 logs quiz-backend"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Add DNS record: quiz-backend.piogino.ch → your-server-ip"
echo "   2. Run 'sudo certbot --nginx -d quiz-backend.piogino.ch' for SSL"
echo ""
