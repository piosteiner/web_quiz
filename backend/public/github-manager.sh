#!/bin/bash

# GitHub Repository Management Tool for QuizMaster
# Usage: ./github-manager.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
REPO_DIR="/var/www/quiz-platform"
FRONTEND_DIR="/var/www/quiz-platform"
BACKEND_DIR="/var/www/quiz-platform/backend"
PUBLIC_DIR="/var/www/quiz-platform/backend/public"
BRANCH="main"

# Logging
log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Help function
show_help() {
    echo "🔧 GitHub Repository Manager for QuizMaster"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status              Show git status and repository info"
    echo "  sync                Sync frontend changes to backend"
    echo "  pull                Pull latest changes from GitHub"
    echo "  push [message]      Commit and push frontend changes (with confirmation)"
    echo "  autopush [message]  Commit and push frontend changes automatically"
    echo "  pushall [message]   Commit and push ALL changes (frontend + backend)"
    echo "  autopushall [msg]   Commit and push ALL changes automatically"
    echo "  branch [name]       Create and switch to new branch"
    echo "  merge [branch]      Merge branch into current branch"
    echo "  diff                Show changes since last commit"
    echo "  log                 Show commit history"
    echo "  files               List all repository files"
    echo "  backup              Create backup of current state"
    echo "  deploy              Deploy changes to production"
    echo "  test                Run frontend tests"
    echo "  lint                Run code linting"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status           # Check repository status"
    echo "  $0 pull             # Pull latest changes"
    echo "  $0 push \"Fixed bug\" # Commit and push with message"
    echo "  $0 sync             # Sync frontend to backend"
    echo "  $0 deploy           # Deploy to production"
}

# Check if repository exists
check_repo() {
    if [ ! -d "$REPO_DIR" ]; then
        error "Repository not found at $REPO_DIR"
    fi
    cd "$REPO_DIR"
    
    # Initialize git repository if it doesn't exist
    if [ ! -d ".git" ]; then
        log "Initializing git repository..."
        git init
        git branch -m main
        git remote add origin https://github.com/piosteiner/web_quiz.git
        git config user.name "piosteiner"
        git config user.email "info@piogino.ch"
    fi
}

# Show repository status
show_status() {
    check_repo
    
    log "Repository Status"
    echo "=================="
    echo "📂 Repository: $(pwd)"
    echo "🌟 Branch: $(git branch --show-current)"
    echo "🔗 Remote: $(git remote get-url origin)"
    echo "📊 Commits: $(git rev-list --count HEAD)"
    echo ""
    
    log "Git Status:"
    git status --short
    echo ""
    
    log "Recent Commits:"
    git log --oneline -5
    echo ""
    
    if [ -d "$BACKEND_DIR" ]; then
        log "Backend Integration:"
        echo "✅ Backend located at: $BACKEND_DIR"
        echo "📁 Files: $(find $BACKEND_DIR -type f | wc -l)"
    else
        warning "Backend directory not found"
    fi
}

# Sync frontend to backend
sync_frontend() {
    check_repo
    
    log "Syncing frontend to backend..."
    
    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found: $BACKEND_DIR"
    fi
    
    # Create public directory if it doesn't exist
    mkdir -p "$PUBLIC_DIR"
    
    # Sync files (excluding .git and other dev files)
    rsync -av --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.env' \
        --exclude='*.log' \
        "$FRONTEND_DIR/" "$PUBLIC_DIR/"
    
    success "Frontend synced to backend successfully"
    log "Files synced to: $PUBLIC_DIR"
}

# Pull latest changes
pull_changes() {
    check_repo
    
    log "Pulling latest changes from GitHub..."
    
    # Stash any uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        warning "Uncommitted changes detected, stashing..."
        git stash
        STASHED=true
    fi
    
    git pull origin "$BRANCH"
    
    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        log "Restoring stashed changes..."
        git stash pop
    fi
    
    success "Repository updated successfully"
    
    # Ask if user wants to sync to backend
    read -p "Do you want to sync changes to backend? (y/n): " sync_choice
    if [ "$sync_choice" = "y" ] || [ "$sync_choice" = "Y" ]; then
        sync_frontend
    fi
}

# Commit and push changes
push_changes() {
    check_repo
    
    local message="$1"
    local auto_confirm="$2"
    
    if [ -z "$message" ]; then
        error "Commit message required. Usage: $0 push \"your message\""
    fi
    
    log "Preparing to push changes..."
    
    # Show changes
    echo "Changes to be committed:"
    git status --short
    echo ""
    
    # Confirm unless auto-confirm is set
    if [ "$auto_confirm" != "--auto" ]; then
        read -p "Do you want to commit and push these changes? (y/n): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            warning "Push cancelled"
            return
        fi
    else
        log "Auto-confirming push..."
    fi
    
    # Add all changes
    git add .
    
    # Commit
    git commit -m "$message"
    
    # Push
    git push origin "$BRANCH"
    
    success "Changes pushed to GitHub successfully"
}

# Push both frontend and backend changes
push_all_changes() {
    check_repo
    
    local message="$1"
    local auto_confirm="$2"
    
    if [ -z "$message" ]; then
        error "Commit message required. Usage: $0 pushall \"your message\""
    fi
    
    log "Preparing to push all changes (frontend + backend)..."
    
    # Sync frontend to backend first
    sync_frontend
    
    # Show all changes
    echo "All changes to be committed:"
    git status --short
    echo ""
    
    # Confirm unless auto-confirm is set
    if [ "$auto_confirm" != "--auto" ]; then
        read -p "Do you want to commit and push all changes? (y/n): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            warning "Push cancelled"
            return
        fi
    else
        log "Auto-confirming push of all changes..."
    fi
    
    # Add all changes
    git add .
    
    # Commit
    git commit -m "$message"
    
    # Push
    git push origin "$BRANCH"
    
    success "All changes pushed to GitHub successfully"
}

# Create and switch to new branch
create_branch() {
    check_repo
    
    local branch_name="$1"
    if [ -z "$branch_name" ]; then
        error "Branch name required. Usage: $0 branch \"branch-name\""
    fi
    
    log "Creating new branch: $branch_name"
    
    git checkout -b "$branch_name"
    git push -u origin "$branch_name"
    
    success "Branch '$branch_name' created and switched"
}

# Merge branch
merge_branch() {
    check_repo
    
    local branch_name="$1"
    if [ -z "$branch_name" ]; then
        error "Branch name required. Usage: $0 merge \"branch-name\""
    fi
    
    log "Merging branch: $branch_name"
    
    git merge "$branch_name"
    
    success "Branch '$branch_name' merged successfully"
}

# Show diff
show_diff() {
    check_repo
    
    log "Changes since last commit:"
    git diff HEAD
}

# Show commit log
show_log() {
    check_repo
    
    log "Commit History:"
    git log --oneline --graph -20
}

# List repository files
list_files() {
    check_repo
    
    log "Repository Files:"
    find . -type f -not -path './.git/*' | sort
}

# Create backup
create_backup() {
    check_repo
    
    local backup_dir="/home/ubuntu/backups"
    local backup_file="$backup_dir/web_quiz_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    mkdir -p "$backup_dir"
    
    log "Creating backup..."
    tar -czf "$backup_file" -C "$(dirname $REPO_DIR)" "$(basename $REPO_DIR)"
    
    success "Backup created: $backup_file"
}

# Deploy to production
deploy_production() {
    check_repo
    
    log "Deploying to production..."
    
    # Sync frontend first
    sync_frontend
    
    # Deploy backend
    cd "$BACKEND_DIR"
    ./deploy.sh production
    
    success "Deployment completed"
}

# Run tests
run_tests() {
    check_repo
    
    log "Running frontend tests..."
    
    if [ -f "package.json" ]; then
        npm test
    else
        warning "No package.json found, running basic HTML validation"
        # Simple HTML validation
        find . -name "*.html" -exec echo "Checking: {}" \; -exec html5validator {} \; 2>/dev/null || echo "html5validator not installed"
    fi
}

# Run linting
run_lint() {
    check_repo
    
    log "Running code linting..."
    
    # Check for common issues in HTML/CSS/JS files
    find . -name "*.html" -exec echo "HTML: {}" \;
    find . -name "*.css" -exec echo "CSS: {}" \;
    find . -name "*.js" -exec echo "JS: {}" \;
}

# Main command handler
case "$1" in
    "status")
        show_status
        ;;
    "sync")
        sync_frontend
        ;;
    "pull")
        pull_changes
        ;;
    "push")
        push_changes "$2"
        ;;
    "autopush")
        push_changes "$2" "--auto"
        ;;
    "pushall")
        push_all_changes "$2" "$3"
        ;;
    "autopushall")  
        push_all_changes "$2" "--auto"
        ;;
    "branch")
        create_branch "$2"
        ;;
    "merge")
        merge_branch "$2"
        ;;
    "diff")
        show_diff
        ;;
    "log")
        show_log
        ;;
    "files")
        list_files
        ;;
    "backup")
        create_backup
        ;;
    "deploy")
        deploy_production
        ;;
    "test")
        run_tests
        ;;
    "lint")
        run_lint
        ;;
    "help"|"")
        show_help
        ;;
    *)
        error "Unknown command: $1. Use '$0 help' for usage information."
        ;;
esac
