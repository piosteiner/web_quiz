#!/bin/bash

# QuizMaster Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: development (default) or production

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-development}
APP_NAME="quiz-master"
BACKUP_DIR="/home/ubuntu/backups"
LOG_FILE="/tmp/deploy-$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
check_requirements() {
    log "Checking deployment requirements..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 16+ first."
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        error "Node.js version 16+ is required. Current version: $(node -v)"
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed."
    fi
    
    # Check if PM2 is installed for production
    if [ "$ENVIRONMENT" = "production" ] && ! command -v pm2 &> /dev/null; then
        warning "PM2 is not installed. Installing PM2..."
        sudo npm install -g pm2
    fi
    
    success "Requirements check passed"
}

# Create backup
create_backup() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Creating backup..."
        
        mkdir -p "$BACKUP_DIR"
        BACKUP_FILE="$BACKUP_DIR/${APP_NAME}_$(date +%Y%m%d_%H%M%S).tar.gz"
        
        if [ -d "/var/www/$APP_NAME" ]; then
            tar -czf "$BACKUP_FILE" -C /var/www "$APP_NAME" 2>/dev/null || true
            success "Backup created: $BACKUP_FILE"
        else
            warning "No existing installation found to backup"
        fi
        
        # Clean old backups (keep last 5)
        find "$BACKUP_DIR" -name "${APP_NAME}_*.tar.gz" -type f | sort -r | tail -n +6 | xargs rm -f
    fi
}

# Deploy application
deploy_app() {
    log "Deploying QuizMaster ($ENVIRONMENT)..."
    
    # Ensure we're in the correct directory
    cd "$(dirname "$0")"
    
    # Install dependencies
    log "Installing dependencies..."
    if [ "$ENVIRONMENT" = "production" ]; then
        npm ci --production --silent
    else
        npm install --silent
    fi
    
    # Set up environment configuration
    log "Configuring environment..."
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ ! -f ".env" ]; then
            cp .env.production .env
            warning "Production .env file created from template. Please configure it with your settings!"
        fi
    fi
    
    # Create necessary directories
    mkdir -p logs uploads/temp public
    
    success "Application deployed"
}

# Start/restart services
manage_services() {
    log "Managing services for $ENVIRONMENT environment..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        # Production deployment with PM2
        log "Starting with PM2..."
        
        # Stop existing processes
        pm2 stop "$APP_NAME" 2>/dev/null || true
        pm2 delete "$APP_NAME" 2>/dev/null || true
        
        # Start application
        pm2 start ecosystem.config.js --env production --name "$APP_NAME"
        pm2 save
        
        # Set up PM2 startup script (only once)
        if ! pm2 startup | grep -q "already setup"; then
            pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash
        fi
        
        success "Application started with PM2"
        
    else
        # Development environment
        log "Development environment detected"
        success "Use 'npm run dev' to start development server"
    fi
}

# Health check
health_check() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Performing health check..."
        
        # Wait for application to start
        sleep 10
        
        # Check if process is running
        if pm2 list | grep -q "$APP_NAME.*online"; then
            success "Application is running"
        else
            error "Application failed to start"
        fi
        
        # Check if port is listening
        if netstat -tlnp | grep -q ":3002.*LISTEN"; then
            success "Application is listening on port 3002"
        else
            error "Application is not listening on port 3002"
        fi
        
        # Check API endpoint
        sleep 5
        if curl -f -s http://localhost:3002/api/health > /dev/null; then
            success "API health check passed"
        else
            warning "API health check failed - check application logs"
        fi
    fi
}

# Display status
show_status() {
    log "Deployment completed!"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo ""
        echo "🚀 QuizMaster is now running in production mode"
        echo ""
        echo "📊 Status:"
        pm2 list
        echo ""
        echo "📝 Logs:"
        echo "  pm2 logs $APP_NAME"
        echo "  pm2 monit"
        echo ""
        echo "🔧 Management:"
        echo "  pm2 restart $APP_NAME"
        echo "  pm2 stop $APP_NAME"
        echo "  pm2 reload $APP_NAME"
        echo ""
        echo "🌐 Application:"
        echo "  Local: http://localhost:3002"
        echo "  API: http://localhost:3002/api/health"
        echo ""
    else
        echo ""
        echo "🛠️  Development deployment completed"
        echo ""
        echo "▶️  Start development server:"
        echo "   npm run dev"
        echo ""
        echo "🧪 Test interface:"
        echo "   http://localhost:3002/test.html"
        echo ""
    fi
    
    echo "📋 Deployment log: $LOG_FILE"
}

# Main deployment process
main() {
    log "Starting QuizMaster deployment (Environment: $ENVIRONMENT)"
    
    check_requirements
    create_backup
    deploy_app
    manage_services
    health_check
    show_status
    
    success "Deployment completed successfully!"
}

# Run deployment
main "$@"
