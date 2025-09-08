#!/bin/bash

# Backend Sync Script - Copy backend files to frontend repository for GitHub deployment
# Usage: ./sync-backend.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Directories
BACKEND_SOURCE="/var/www/quiz-platform/backend"
FRONTEND_DIR="/var/www/quiz-platform/frontend"
BACKEND_TARGET="$FRONTEND_DIR/backend"

log "Syncing backend files to frontend repository..."

# Create backend directory in frontend if it doesn't exist
mkdir -p "$BACKEND_TARGET"

# Copy backend files (excluding sensitive and unnecessary files)
rsync -av --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.env.*' \
    --exclude='logs/' \
    --exclude='data/' \
    --exclude='uploads/' \
    --exclude='public/' \
    --exclude='*.log' \
    --exclude='*.pid' \
    --exclude='.pm2/' \
    "$BACKEND_SOURCE/" "$BACKEND_TARGET/"

success "Backend files synced to: $BACKEND_TARGET"

# Optional: Auto-commit to GitHub
read -p "Do you want to commit and push backend changes to GitHub? (y/n): " commit_choice
if [ "$commit_choice" = "y" ] || [ "$commit_choice" = "Y" ]; then
    cd "$FRONTEND_DIR"
    ./github-manager.sh autopush "🔄 Backend sync: Updated backend files in repository"
    success "Backend changes pushed to GitHub!"
fi

log "Backend is now available at: https://github.com/piosteiner/web_quiz/tree/main/backend"
