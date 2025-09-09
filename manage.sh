#!/bin/bash

# Quiz Platform Management Script
# Manages both frontend and backend fromstart_server() {
    echo "Starting Quiz Platform server..."
    cd "$PROJECT_ROOT"
    
    # Check if Node.js dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    echo "Server started with PM2"
    echo "View logs: pm2 logs quiz-platform"
    echo "Monitor: pm2 monit"
}t -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Project paths
PROJECT_ROOT="/var/www/quiz-platform"
SRC_DIR="$PROJECT_ROOT/src"
PUBLIC_DIR="$PROJECT_ROOT/public"

# Logging
log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Help function
show_help() {
    echo "🧠 Quiz Platform Management Tool"
    echo ""
    echo "Usage: ./manage.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start                 Start the production server with PM2"
    echo "  stop                  Stop the production server"
    echo "  restart               Restart the production server"
    echo "  status                Show server status"
    echo "  logs                  Show server logs"
    echo "  dev                   Show development commands"
    echo ""
    echo "Maintenance Commands:"
    echo "  backend:install       Install dependencies"
    echo "  backend:test          Run tests"
    echo "  backup                Create backup"
    echo ""
    echo "Note: Many commands are deprecated after single-server migration"
    echo ""
    echo "Backend Commands:"
    echo "  backend:install       Install backend dependencies"
    echo "  backend:test          Run backend tests"
    echo "  backend:deploy        Deploy to production"
    echo ""
    echo "Combined Commands:"
    echo "  deploy                Full deployment (sync + restart)"
    echo "  update                Update from GitHub and deploy"
    echo "  backup                Create backup"
    echo ""
    echo "Examples:"
    echo "  ./manage.sh start"
    echo "  ./manage.sh sync"
    echo "  ./manage.sh frontend:push"
    echo "  ./manage.sh deploy"
}

# Sync frontend files to public directory (deprecated - using single server now)
sync_frontend() {
    warning "Frontend sync is deprecated - all files are now served from public/ directory"
    echo "Frontend files are already in the correct location: $PUBLIC_DIR"
}

# Start production server
start_server() {
    log "Starting Quiz Platform production server..."
    cd "$PROJECT_ROOT"
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm install
    fi
    
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    success "Server started with PM2"
    echo "View logs: pm2 logs quiz-platform"
    echo "Monitor: pm2 monit"
}

# Stop server
stop_server() {
    log "Stopping Quiz Platform server..."
    cd "$PROJECT_ROOT"
    pm2 stop quiz-platform 2>/dev/null || true
    success "Server stopped"
}

# Restart server
restart_server() {
    log "Restarting Quiz Platform server..."
    cd "$PROJECT_ROOT"
    pm2 restart quiz-platform
    success "Server restarted"
}

# Show status
show_status() {
    log "Quiz Platform Status:"
    echo ""
    
    # Server status
    echo "🖥️  Server Status:"
    cd "$BACKEND_DIR"
    pm2 status quiz-master 2>/dev/null || echo "   Server not running"
    echo ""
    
    # Frontend git status
    echo "📁 Frontend Git Status:"
    cd "$FRONTEND_DIR"
    git status --porcelain || echo "   No git repository"
    echo ""
    
    # Directory sizes
    echo -e "
� Directory sizes:"
    du -sh "$SRC_DIR" "$PUBLIC_DIR" 2>/dev/null
    
    echo -e "
🌐 Server check:"
    curl -s -o /dev/null -w "HTTP Status: %{http_code}
" http://localhost:3002/ || echo "Server not responding"
    echo ""
}

# Show logs
show_logs() {
    cd "$PROJECT_ROOT"
    pm2 logs quiz-platform --lines 50
}

# Development operations (deprecated - use npm scripts instead)
frontend_commit() {
    warning "Frontend operations are deprecated - use git commands directly in project root"
    echo "cd $PROJECT_ROOT && git add . && git commit"
}

frontend_push() {
    warning "Frontend operations are deprecated - use git commands directly in project root"
    echo "cd $PROJECT_ROOT && git push"
}

frontend_status() {
    warning "Frontend operations are deprecated - use git commands directly in project root"
    echo "cd $PROJECT_ROOT && git status"
}

# Dependency management
backend_install() {
    log "Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm install
    success "Dependencies installed"
}

backend_test() {
    log "Running tests..."
    cd "$PROJECT_ROOT"
    npm test
}

# Development helper
dev_mode() {
    log "Quiz Platform Development Commands"
    echo "=================================="
    echo ""
    echo "Available npm scripts:"
    echo "  npm start          - Start production server"
    echo "  npm run dev        - Start development server with nodemon"
    echo "  npm test           - Run test suite"
    echo ""
    echo "Manual commands:"
    echo "  cd $PROJECT_ROOT"
    echo "  node src/app.js    - Start server directly"
    echo ""
    echo "PM2 commands:"
    echo "  pm2 start ecosystem.config.js --env development"
    echo "  pm2 logs quiz-platform"
    echo "  pm2 monit"
}

# Full deployment (deprecated)
full_deploy() {
    warning "Deployment functions are deprecated after single-server migration"
    echo "For production deployment:"
    echo "  cd $PROJECT_ROOT && npm install && pm2 start ecosystem.config.js --env production"
}

# Update deployment (deprecated)
update_deploy() {
    warning "Update deployment is deprecated after single-server migration"
    echo "For updates:"
    echo "  cd $PROJECT_ROOT && git pull && npm install && pm2 restart quiz-platform"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local backup_name="quiz-platform-backup-$(date +%Y%m%d_%H%M%S)"
    local backup_path="/tmp/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup application files (without node_modules and logs)
    rsync -av --exclude='node_modules' --exclude='logs' --exclude='.git' "$PROJECT_ROOT/" "$backup_path/"
    
    # Create archive
    cd /tmp
    tar -czf "$backup_name.tar.gz" "$backup_name"
    rm -rf "$backup_path"
    
    success "Backup created: /tmp/$backup_name.tar.gz"
}

# Main command processing
case "$1" in
    "start")
        start_server
        ;;
    "stop")
        stop_server
        ;;
    "restart")
        restart_server
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "dev")
        dev_mode
        ;;
    "sync")
        sync_frontend
        ;;
    "frontend:commit")
        frontend_commit
        ;;
    "frontend:push")
        frontend_push
        ;;
    "frontend:status")
        frontend_status
        ;;
    "backend:install")
        backend_install
        ;;
    "backend:test")
        backend_test
        ;;
    "deploy")
        full_deploy
        ;;
    "update")
        update_deploy
        ;;
    "backup")
        create_backup
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        error "Unknown command: $1. Use './manage.sh help' for usage information."
        ;;
esac
