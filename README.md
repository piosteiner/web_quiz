# 🧠 Quiz Platform - Complete Interactive Quiz System

A modern, full-stack quiz platform with real-time capabilities, combining sophisticated frontend and powerful backend infrastructure.

## 📁 Project Structure

```
quiz-platform/
├── frontend/           # GitHub Repository (web_quiz)
│   ├── .git/          # Git repository 
│   ├── html/          # HTML pages (admin, join, live-control)
│   ├── js/            # Frontend JavaScript (Socket.IO integrated)
│   ├── css/           # Stylesheets
│   └── index.html     # Landing page
├── backend/           # Production Server (quiz-master)
│   ├── server/        # Express.js backend
│   ├── public/        # Served frontend files (synced from frontend/)
│   ├── config/        # Server configuration
│   ├── logs/          # Application logs
│   └── package.json   # Backend dependencies
└── README.md          # This file
```

## 🚀 Quick Start

### Start Development
```bash
cd /var/www/quiz-platform

# Start backend server (serves frontend + API)
cd backend
./start-production.sh
```

### Frontend Development Workflow
```bash
cd /var/www/quiz-platform/frontend

# Make changes to frontend files
# Commit to GitHub
git add -A
git commit -m "Frontend updates"
git push origin main

# Sync to backend
cd ../backend
rsync -av ../frontend/ public/
pm2 restart quiz-master
```

## 🌐 Access Points

- **Main Application**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/html/admin.html  
- **Live Control**: http://localhost:3000/html/live-control.html
- **API Endpoints**: http://localhost:3000/api/*
- **WebSocket**: ws://localhost:3000

## ✨ Features

### 🔴 Live Quiz Control
- Real-time session management
- Global timer with start/pause/skip
- Question navigation
- Live participant tracking

### 📊 Live Scoreboard  
- Real-time leaderboard updates
- Time-based scoring system
- Participant connection status
- Automatic results calculation

### ⏱️ Global Timer
- Synchronized timing for all participants
- Configurable time per question
- Auto-advance capabilities
- Pause/resume functionality

### 👥 Multi-user Sessions
- Easy join process via quiz name/code
- Participant management
- Connection monitoring
- Session limits and controls

## 🛠️ Management Commands

### Backend Operations
```bash
cd /var/www/quiz-platform/backend

# Start production
./start-production.sh

# Monitor
pm2 status
pm2 logs quiz-master
pm2 monit

# GitHub management
./github-manager.sh status
./github-manager.sh deploy
```

### Frontend Sync
```bash
# Sync frontend to backend public directory
cd /var/www/quiz-platform/backend
rsync -av ../frontend/ public/
```

## 📦 Dependencies

### Frontend
- Socket.IO client for real-time communication
- Modern ES6+ JavaScript modules
- Responsive CSS framework

### Backend  
- Node.js + Express.js
- Socket.IO for WebSocket handling
- PM2 for process management
- Rate limiting and security middleware

## 🔧 Configuration

### Environment Variables
```bash
# In backend/.env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000
```

### Production Deployment
1. Set environment variables in `backend/.env.production`
2. Configure domain in Nginx (see backend/DEPLOYMENT_GUIDE.md)
3. Set up SSL certificates
4. Start with `./start-production.sh`

---

**🎯 This consolidated structure keeps your quiz platform organized as a single project while maintaining clear separation between frontend development and backend infrastructure.**
