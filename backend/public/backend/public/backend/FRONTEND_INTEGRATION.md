# 🔗 Frontend Integration Guide

## Overview

This guide explains how to integrate your existing GitHub repository frontend with the QuizMaster backend server.

## Integration Strategy: Combined Deployment (Recommended)

### Architecture
```
Your Domain (e.g., quizmaster.com)
├── / (Static Frontend Files)
├── /api/ (Backend API)
└── /socket.io/ (WebSocket)
```

## Step 1: Prepare Your GitHub Frontend

### 1.1 Download Your GitHub Repository
```bash
# Clone your existing frontend
git clone https://github.com/piosteiner/web_quiz.git /tmp/frontend-backup

# Copy frontend files to backend public directory
mkdir -p /var/www/quiz-master/public
cp -r /tmp/frontend-backup/* /var/www/quiz-master/public/

# Verify structure
ls -la /var/www/quiz-master/public/
```

### 1.2 Update Frontend Configuration

Your GitHub frontend needs minimal changes to work with the backend:

#### Update WebSocket Connection
In your JavaScript files, find Socket.IO connections and update them:

```javascript
// OLD (if you had a specific server URL):
// const socket = io('ws://some-external-server.com');

// NEW (use relative connection):
const socket = io(); // This will connect to the same domain

// Or for development:
const socket = io(window.location.origin);
```

#### Update API Calls
Replace any absolute API URLs with relative paths:

```javascript
// OLD:
// fetch('https://external-api.com/api/quizzes')

// NEW:
fetch('/api/quizzes')
fetch('/api/sessions')
fetch('/api/participants')
```

### 1.3 Map Your Frontend Events to Backend

Your GitHub repo already has these features implemented. Here's how they map to the backend:

#### Quiz Management
```javascript
// Your existing frontend → Backend API
createQuiz(quizData) → POST /api/quizzes
getQuizzes() → GET /api/quizzes
updateQuiz(id, data) → PUT /api/quizzes/:id
deleteQuiz(id) → DELETE /api/quizzes/:id
```

#### Session Management
```javascript
// Your existing frontend → Backend API
createSession(quizId) → POST /api/sessions
joinSession(sessionId) → WebSocket: join-session
startSession() → WebSocket: start-session
endSession() → WebSocket: end-session
```

#### Real-time Events
```javascript
// Your existing frontend events → Backend WebSocket events
socket.on('questionChanged') → socket.on('question-changed')
socket.on('participantJoined') → socket.on('participant-joined')
socket.on('leaderboardUpdate') → socket.on('leaderboard-updated')
socket.on('sessionStarted') → socket.on('session-started')
socket.on('sessionEnded') → socket.on('session-ended')
```

## Step 2: File Structure After Integration

```
/var/www/quiz-master/
├── server/                    # Backend (already implemented)
│   ├── app.js
│   ├── quiz-manager.js
│   ├── session-manager.js
│   └── ...
├── public/                    # Your GitHub frontend
│   ├── index.html            # Main entry point
│   ├── admin.html            # Quiz creation interface
│   ├── join.html             # Participant join page
│   ├── live-control.html     # Host control interface
│   ├── css/
│   │   ├── main.css
│   │   ├── admin.css
│   │   └── ...
│   ├── js/
│   │   ├── main.js
│   │   ├── admin.js
│   │   ├── join.js
│   │   ├── live-control.js
│   │   ├── realtime.js
│   │   └── ...
│   └── assets/
│       ├── images/
│       └── fonts/
├── package.json
├── ecosystem.config.js
└── deploy.sh
```

## Step 3: Update Your Frontend Components

### 3.1 Main Application (index.html)
Your landing page should link to the quiz functionality:

```html
<!DOCTYPE html>
<html>
<head>
    <title>QuizMaster - Live Quiz Platform</title>
</head>
<body>
    <!-- Your existing beautiful landing page -->
    
    <div class="action-buttons">
        <a href="/admin.html" class="btn-primary">Create Quiz</a>
        <a href="/join.html" class="btn-secondary">Join Quiz</a>
    </div>
    
    <!-- Your existing scripts -->
    <script src="/socket.io/socket.io.js"></script>
    <script src="/js/main.js"></script>
</body>
</html>
```

### 3.2 Admin Interface (admin.html)
For quiz creation and management:

```javascript
// Quiz creation
async function createQuiz(quizData) {
    try {
        const response = await fetch('/api/quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizData)
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Quiz created:', result.data);
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error creating quiz:', error);
        throw error;
    }
}

// Create live session
async function createLiveSession(quizId, config = {}) {
    try {
        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId, config })
        });
        
        const result = await response.json();
        if (result.success) {
            // Redirect to live control interface
            window.location.href = `/live-control.html?session=${result.data.session.id}`;
        }
    } catch (error) {
        console.error('Error creating session:', error);
    }
}
```

### 3.3 Live Control Interface (live-control.html)
For hosting and controlling live quizzes:

```javascript
class LiveQuizController {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.socket = io();
        this.currentQuestion = 0;
        this.participants = new Map();
        
        this.setupSocketListeners();
        this.joinAsHost();
    }
    
    setupSocketListeners() {
        this.socket.on('session-joined-host', (data) => {
            this.quiz = data.quiz;
            this.session = data.session;
            this.updateUI();
        });
        
        this.socket.on('participant-joined', (data) => {
            this.participants.set(data.participant.id, data.participant);
            this.updateParticipantsList();
        });
        
        this.socket.on('leaderboard-updated', (data) => {
            this.updateLeaderboard(data.leaderboard);
        });
        
        // Add more event listeners as needed
    }
    
    joinAsHost() {
        this.socket.emit('join-session-host', {
            sessionId: this.sessionId,
            hostToken: 'your-host-token' // Implement token system
        });
    }
    
    startSession() {
        this.socket.emit('start-session');
    }
    
    nextQuestion() {
        this.currentQuestion++;
        this.socket.emit('change-question', {
            questionIndex: this.currentQuestion
        });
    }
    
    endSession() {
        this.socket.emit('end-session');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    
    if (sessionId) {
        window.quizController = new LiveQuizController(sessionId);
    }
});
```

### 3.4 Participant Interface (join.html)
For participants to join and play quizzes:

```javascript
class QuizParticipant {
    constructor() {
        this.socket = io();
        this.sessionId = null;
        this.participantId = null;
        this.currentQuestion = null;
        
        this.setupSocketListeners();
    }
    
    setupSocketListeners() {
        this.socket.on('session-joined', (data) => {
            this.sessionId = data.session.id;
            this.participantId = data.participant.id;
            this.showWaitingRoom();
        });
        
        this.socket.on('session-started', () => {
            this.showQuizInterface();
        });
        
        this.socket.on('question-changed', (data) => {
            this.displayQuestion(data.question, data.questionIndex);
            this.startTimer(data.timeLimit);
        });
        
        this.socket.on('answer-submitted', (data) => {
            this.showAnswerResult(data.isCorrect, data.score);
        });
        
        this.socket.on('leaderboard', (data) => {
            this.updateLeaderboard(data.leaderboard);
        });
        
        this.socket.on('session-ended', (data) => {
            this.showFinalResults(data.finalLeaderboard);
        });
    }
    
    joinSession(sessionId, participantName) {
        this.socket.emit('join-session', {
            sessionId,
            participantName
        });
    }
    
    submitAnswer(answer) {
        this.socket.emit('submit-answer', {
            questionIndex: this.currentQuestion,
            answer: answer
        });
    }
}

// Initialize participant interface
window.participant = new QuizParticipant();
```

## Step 4: Testing the Integration

### 4.1 Test Locally
1. Copy your frontend files to `/var/www/quiz-master/public/`
2. Start the server: `npm run dev`
3. Visit: http://localhost:3000
4. Test all functionality:
   - Quiz creation in admin interface
   - Session creation and management
   - Participant joining and gameplay
   - Real-time features

### 4.2 Test API Integration
```bash
# Test quiz creation
curl -X POST http://localhost:3000/api/quizzes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Quiz","questions":[...]}'

# Test session creation
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"quizId":"your-quiz-id"}'
```

## Step 5: Update Package.json Scripts

Add frontend-specific scripts to your package.json:

```json
{
  "scripts": {
    "start": "node server/app.js",
    "dev": "nodemon server/app.js",
    "build": "echo 'No build step needed for static frontend'",
    "deploy": "./deploy.sh production",
    "deploy:dev": "./deploy.sh development",
    "frontend:sync": "cp -r /path/to/your/github/repo/* public/",
    "test": "npm run test:api && npm run test:frontend",
    "test:api": "curl -f http://localhost:3000/api/health",
    "test:frontend": "echo 'Frontend integration tests would go here'"
  }
}
```

## Step 6: Environment-Specific Configuration

### Development Configuration
```javascript
// In your frontend JavaScript
const config = {
    apiBaseUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : '/api',
    socketUrl: window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : window.location.origin
};
```

### Production Configuration
```javascript
// Production config (automatic)
const config = {
    apiBaseUrl: '/api',
    socketUrl: window.location.origin
};
```

## Summary

After integration, your system will have:

✅ **Your Beautiful Frontend**: All your existing UI/UX design
✅ **Robust Backend**: Real-time session management, scoring, validation
✅ **Single Domain**: No CORS issues, simplified deployment
✅ **Real-time Features**: WebSocket communication for live quizzes
✅ **Production Ready**: PM2, Nginx, SSL support

The result is a complete, production-ready quiz platform that combines your sophisticated frontend with a robust, scalable backend! 🚀
