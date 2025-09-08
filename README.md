# 🧠 QuizMaster - Open Source Interactive Quiz Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![German](https://img.shields.io/badge/Language-German-blue.svg)](README.md)
[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen.svg)](https://piosteiner.github.io/web_quiz/)
[![Full Stack](https://img.shields.io/badge/Stack-Frontend%2BBackend-brightgreen.svg)](README.md)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-orange.svg)](CONTRIBUTING.md)

> **🚀 Complete Full-Stack Quiz Platform** - Frontend + Backend + Real-time Features

Eine moderne, vollständig funktionsfähige Quiz-Plattform mit Echtzeit-Funktionen, entwickelt für den deutschen Sprachraum. Jetzt als **Open Source Full-Stack Project** mit Frontend und Backend!

## 📁 Project Structure

```
QuizMaster/
├── 🌐 Frontend/              # Frontend Application (HTML/CSS/JS)
│   ├── html/                # Quiz interfaces (admin, join, live-control)
│   ├── js/                  # Frontend logic with Socket.IO integration
│   ├── css/                 # Responsive styling with theme system
│   └── index.html           # Landing page
├── ⚙️ Backend/               # Full Backend Server (Node.js)
│   ├── server/              # Express.js + Socket.IO real-time server
│   │   ├── app.js          # Main application
│   │   ├── quiz-manager.js  # Quiz logic and management
│   │   ├── session-manager.js # Live session handling
│   │   └── websocket-handler.js # Real-time WebSocket communication
│   ├── routes/              # API endpoints
│   ├── middleware/          # Security and rate limiting
│   ├── data/               # Runtime data (gitignored for privacy)
│   ├── .env.example        # Environment configuration template
│   └── package.json        # Backend dependencies
└── 📚 Documentation/         # Setup guides and API docs
```

## 🔒 Privacy & Security First

This project is designed to be **open source friendly** while protecting sensitive data:

### ✅ **Open Source Components**
- 🔓 Complete frontend application code
- 🔓 Full backend server implementation  
- 🔓 Real-time WebSocket communication setup
- 🔓 Deployment and production configurations
- 🔓 Comprehensive documentation and setup guides
- 🔓 Example configurations and templates

### 🚫 **Protected & Gitignored**
- 🔒 Environment variables and secrets (`.env`)
- 🔒 Quiz content, questions, and answers
- 🔒 Participant data and session information
- 🔒 User uploads and media files
- 🔒 Production keys and certificates
- 🔒 Runtime logs and cache data

## ✨ Features Overview

### 🔴 **Live Quiz Control**
- **Real-time Session Management**: Vollständige Kontrolle über Quiz-Sessions
- **Live Timer Control**: Globaler Timer mit Start/Pause/Skip Funktionen  
- **Question Navigation**: Vor- und Rückwärts durch Fragen navigieren
- **Session Status**: Live Status-Updates für alle Teilnehmer

### 📊 **Live Scoreboard**
- **Real-time Leaderboard**: Sofortige Punktestand-Updates
- **Time-based Scoring**: Zeitboni für schnelle Antworten
- **Participant Tracking**: Live-Überwachung aller Teilnehmer
- **Final Results**: Automatische Ergebnisauswertung

### ⏱️ **Global Timer**
- **Synchronized Timing**: Alle Teilnehmer sehen denselben Timer
- **Flexible Time Settings**: Anpassbare Zeit pro Frage
- **Auto-advance**: Automatischer Übergang zur nächsten Frage  
- **Pause/Resume**: Timer kann pausiert und fortgesetzt werden

### 👥 **Multi-User Sessions**
- **Easy Join Process**: Einfacher Beitritt über Quiz-Name oder Code
- **Live Participant List**: Echtzeitliste aller Teilnehmer
- **Connection Status**: Überwachung der Verbindungsstatus
- **Participant Limits**: Konfigurierbare Teilnehmerbegrenzung

### 🎨 **Professional Frontend**
- **Complete Theme System**: Light/Dark Mode mit Systemerkennung
- **Admin Panel**: Intuitive Quiz-Erstellung und -Verwaltung
- **Responsive Design**: Optimiert für alle Geräte
- **German Localization**: Vollständig auf deutsche Benutzer ausgelegt

### ⚙️ **Robust Backend**
- **Express.js Server**: Production-ready Node.js backend
- **Socket.IO Integration**: Real-time WebSocket communication
- **Session Management**: Multi-user quiz session handling
- **Security Middleware**: Rate limiting, CORS, helmet protection
- **PM2 Ready**: Cluster mode for production deployment

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+ recommended)
- npm or yarn
- Git

### Installation

1. **Clone the Repository**
```bash
git clone https://github.com/piosteiner/web_quiz.git
cd web_quiz
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Development Server**
```bash
npm start
# Or for production:
npm run production
```

4. **Access the Application**
- **Main App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/html/admin.html
- **Live Control**: http://localhost:3000/html/live-control.html

## 🛠️ Development

### Frontend Development
The frontend is served directly by the backend server. Edit files in the root directory:
- `html/` - Quiz interfaces
- `js/` - Frontend logic
- `css/` - Styling

### Backend Development
Backend code is in the `backend/` directory:
- `server/app.js` - Main application
- `server/routes/` - API endpoints
- `server/middleware/` - Security and utilities

### Environment Configuration
Copy `backend/.env.example` to `backend/.env` and configure:
```bash
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000
```

## 📦 Technology Stack

### Frontend
- **HTML5/CSS3/ES6+** - Modern web standards
- **Socket.IO Client** - Real-time communication
- **Responsive CSS** - Mobile-first design
- **Theme System** - Light/dark mode support

### Backend
- **Node.js + Express.js** - Web server framework
- **Socket.IO** - WebSocket real-time communication
- **PM2** - Process management for production
- **Helmet** - Security middleware
- **Rate Limiting** - API protection

## 🌐 Access Points

- **🏠 Landing Page**: `/` - Project overview and features
- **👨‍💼 Admin Panel**: `/html/admin.html` - Create and manage quizzes
- **🎮 Join Quiz**: `/html/join.html` - Participate in quizzes
- **🎛️ Live Control**: `/html/live-control.html` - Real-time quiz control
- **🔌 API**: `/api/*` - Backend API endpoints
- **⚡ WebSocket**: `ws://localhost:3000` - Real-time communication

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure no sensitive data is committed
5. Submit a pull request

### Security Note
When contributing, please ensure:
- No real quiz content in commits
- No participant data or PII
- No production secrets or keys
- Use example/template files for configuration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/piosteiner/web_quiz/issues)
- **Discussions**: [GitHub Discussions](https://github.com/piosteiner/web_quiz/discussions)
- **Email**: [pioginosteiner@gmail.com](mailto:pioginosteiner@gmail.com)

---

**🎯 Made with ❤️ for the German-speaking quiz community**
