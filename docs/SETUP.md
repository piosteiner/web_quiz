# 🔧 Setup Guide - QuizMaster Full-Stack Development

Complete setup guide for developing the QuizMaster quiz platform.

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Git**
- **Text Editor** (VS Code recommended)

## 🚀 Quick Setup

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/piosteiner/web_quiz.git
cd web_quiz

# Install backend dependencies
cd backend
npm install

# Setup environment
cp .env.example .env
```

### 2. Configure Environment
Edit `backend/.env`:
```bash
# Basic configuration
NODE_ENV=development
PORT=3002
SESSION_SECRET=your-development-secret-key
ALLOWED_ORIGINS=http://localhost:3002,http://127.0.0.1:3002

# Optional: Database (uses file-based storage by default)
# DATABASE_URL=your-database-url
```

### 3. Start Development Server
```bash
# From backend directory
npm run dev

# Or start with PM2 for production-like environment
npm run production
```

### 4. Access the Application
- **Frontend**: http://localhost:3002
- **Admin Panel**: http://localhost:3002/html/admin.html
- **API**: http://localhost:3002/api/health

## 📁 Project Structure Deep Dive

```
web_quiz/
├── 🌐 Frontend Files (Root)
│   ├── html/
│   │   ├── admin.html          # Quiz creation interface
│   │   ├── join.html           # Participant join page
│   │   └── live-control.html   # Real-time quiz control
│   ├── js/
│   │   ├── main.js             # Core frontend logic
│   │   ├── realtime.js         # Socket.IO integration
│   │   ├── admin.js            # Admin panel functionality
│   │   └── join.js             # Participant functionality
│   ├── css/
│   │   ├── styles.css          # Main stylesheet
│   │   └── components/         # Component-specific styles
│   └── index.html              # Landing page
├── ⚙️ Backend/ (Server)
│   ├── server/
│   │   ├── app.js              # Main Express application
│   │   ├── quiz-manager.js     # Quiz logic and storage
│   │   ├── session-manager.js  # Live session handling
│   │   └── websocket-handler.js # Real-time communication
│   ├── routes/
│   │   ├── quizzes.js          # Quiz CRUD operations
│   │   ├── sessions.js         # Session management
│   │   └── participants.js     # Participant handling
│   ├── middleware/
│   │   ├── auth.js             # Authentication (if enabled)
│   │   ├── rate-limiter.js     # API rate limiting
│   │   └── error-handler.js    # Global error handling
│   ├── data/                   # Runtime data (gitignored)
│   ├── logs/                   # Application logs (gitignored)
│   ├── uploads/                # File uploads (gitignored)
│   └── package.json            # Backend dependencies
└── 📚 Documentation
    ├── API.md                  # API documentation
    ├── SETUP.md                # This file
    └── CONTRIBUTING.md         # Contribution guidelines
```

## 🔧 Development Workflow

### Frontend Development
1. **Edit Files**: Modify HTML, CSS, JS in the root directory
2. **Live Reload**: The server serves frontend files directly
3. **Test Changes**: Refresh browser to see updates
4. **Debug**: Use browser developer tools

### Backend Development
1. **Edit Server Code**: Modify files in `backend/server/`
2. **Restart Server**: Use `npm run dev` for auto-restart with nodemon
3. **Test API**: Use tools like Postman or curl
4. **Check Logs**: Monitor console output or log files

### Database/Storage
- **Development**: Uses file-based storage in `backend/data/`
- **Production**: Can be configured for external databases
- **Data Protection**: All data directories are gitignored

## 🌐 Development URLs

| Component | URL | Description |
|-----------|-----|-------------|
| **Landing Page** | http://localhost:3002 | Main application entry |
| **Admin Panel** | http://localhost:3002/html/admin.html | Create/manage quizzes |
| **Join Quiz** | http://localhost:3002/html/join.html | Participant interface |
| **Live Control** | http://localhost:3002/html/live-control.html | Real-time quiz control |
| **API Health** | http://localhost:3002/api/health | Server status check |
| **API Docs** | http://localhost:3002/api/docs | API documentation |

## 🔌 API Endpoints

### Quiz Management
- `GET /api/quizzes` - List all quizzes
- `POST /api/quizzes` - Create new quiz
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz

### Session Management
- `POST /api/sessions` - Create quiz session
- `GET /api/sessions/:id` - Get session info
- `POST /api/sessions/:id/start` - Start session
- `POST /api/sessions/:id/end` - End session

### Participants
- `POST /api/sessions/:id/join` - Join session
- `GET /api/sessions/:id/participants` - List participants
- `POST /api/sessions/:id/answer` - Submit answer

## 🔄 Real-time Events (Socket.IO)

### Client → Server
- `join_session` - Join quiz session
- `submit_answer` - Submit quiz answer
- `request_leaderboard` - Request current standings

### Server → Client
- `session_started` - Quiz session began
- `question_changed` - New question displayed
- `timer_updated` - Timer countdown update
- `leaderboard_updated` - Scores changed
- `session_ended` - Quiz completed

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests (if available)
npm run test:frontend
```

### Manual Testing Checklist
- [ ] Create quiz in admin panel
- [ ] Start live session
- [ ] Join as participant
- [ ] Submit answers
- [ ] Verify real-time updates
- [ ] Check final results

## 🚀 Production Deployment

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
PORT=3002
SESSION_SECRET=strong-production-secret
ALLOWED_ORIGINS=https://yourdomain.com
```

### Using PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start with ecosystem file
pm2 start ecosystem.config.js

# Monitor
pm2 status
pm2 logs
```

### Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Security Considerations

### Development
- Use strong session secrets
- Keep .env files private
- Don't commit sensitive data
- Use HTTPS in production

### Data Protection
- Quiz content is gitignored
- Participant data is protected
- Logs are excluded from version control
- Uploads are secured

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3002
pkill -f "node"
# Or use different port
PORT=3001 npm start
```

**Socket.IO connection failed:**
- Check CORS settings in backend
- Verify WebSocket is enabled
- Test with different browser

**Frontend not loading:**
- Ensure backend server is running
- Check console for errors
- Verify file paths are correct

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Or specific modules
DEBUG=socket.io* npm run dev
```

## 📞 Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share ideas
- **Email**: Contact maintainer directly
- **Documentation**: Check API.md and other docs

---

**Happy coding! 🎉**
