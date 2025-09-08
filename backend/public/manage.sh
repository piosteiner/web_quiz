#!/bin/bash

# Quiz Platform Management Script
# Manages both frontend and backend from project root

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Project paths
PROJECT_ROOT="/var/www/quiz-platform"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
PUBLIC_DIR="$BACKEND_DIR/public"

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
    echo "  start                 Start the production server"
    echo "  stop                  Stop the production server"
    echo "  restart               Restart the production server"
    echo "  status                Show server status"
    echo "  logs                  Show server logs"
    echo "  sync                  Sync frontend to backend"
    echo "  dev                   Start development mode"
    echo ""
    echo "Frontend Commands:"
    echo "  frontend:commit       Commit frontend changes"
    echo "  frontend:push         Push to GitHub"
    echo "  frontend:status       Check git status"
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

# Sync frontend to backend
sync_frontend() {
    log "Syncing frontend to backend..."
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        error "Frontend directory not found: $FRONTEND_DIR"
    fi
    
    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found: $BACKEND_DIR"
    fi
    
    # Create public directory if it doesn't exist
    mkdir -p "$PUBLIC_DIR"
    
    # Sync files
    rsync -av --exclude='.git' --exclude='node_modules' "$FRONTEND_DIR/" "$PUBLIC_DIR/"
    
    # Show sync results
    local files_synced=$(rsync -av --dry-run --exclude='.git' --exclude='node_modules' "$FRONTEND_DIR/" "$PUBLIC_DIR/" | wc -l)
    success "Frontend synced to backend ($files_synced files processed)"
}

# Start production server
start_server() {
    log "Starting Quiz Platform production server..."
    cd "$BACKEND_DIR"
    
    # Check if frontend is synced
    if [ ! -f "$PUBLIC_DIR/index.html" ]; then
        warning "Frontend not synced. Running sync first..."
        sync_frontend
    fi
    
    # Start with production script
    if [ -f "./start-production.sh" ]; then
        ./start-production.sh
    else
        error "Production start script not found"
    fi
}

# Stop server
stop_server() {
    log "Stopping Quiz Platform server..."
    cd "$BACKEND_DIR"
    pm2 stop quiz-master 2>/dev/null || true
    success "Server stopped"
}

# Restart server
restart_server() {
    log "Restarting Quiz Platform server..."
    cd "$BACKEND_DIR"
    pm2 restart quiz-master 2>/dev/null || start_server
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
    echo "📊 Directory Sizes:"
    du -sh "$FRONTEND_DIR" "$BACKEND_DIR" 2>/dev/null
    echo ""
}

# Show logs
show_logs() {
    cd "$BACKEND_DIR"
    pm2 logs quiz-master --lines 50
}

# Frontend operations
frontend_commit() {
    log "Committing frontend changes..."
    cd "$FRONTEND_DIR"
    
    if [ -z "$(git status --porcelain)" ]; then
        warning "No changes to commit"
        return
    fi
    
    git add -A
    echo "Enter commit message:"
    read -r commit_message
    git commit -m "$commit_message"
    success "Changes committed"
}

frontend_push() {
    log "Pushing frontend to GitHub..."
    cd "$FRONTEND_DIR"
    git push origin main
    success "Pushed to GitHub"
}

frontend_status() {
    cd "$FRONTEND_DIR"
    git status
}

# Backend operations
backend_install() {
    log "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    success "Dependencies installed"
}

backend_test() {
    log "Running backend tests..."
    cd "$BACKEND_DIR"
    npm test
}

# Full deployment
full_deploy() {
    log "Starting full deployment..."
    sync_frontend
    restart_server
    success "Deployment complete!"
}

# Update from GitHub and deploy
update_deploy() {
    log "Updating from GitHub and deploying..."
    
    cd "$FRONTEND_DIR"
    git pull origin main
    
    sync_frontend
    restart_server
    success "Update and deployment complete!"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local backup_name="quiz-platform-backup-$(date +%Y%m%d_%H%M%S)"
    local backup_path="/tmp/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup frontend (without .git)
    rsync -av --exclude='.git' "$FRONTEND_DIR/" "$backup_path/frontend/"
    
    # Backup backend (without node_modules)
    rsync -av --exclude='node_modules' --exclude='logs' "$BACKEND_DIR/" "$backup_path/backend/"
    
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
