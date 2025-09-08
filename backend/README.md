# 🧠 QuizMaster - Interactive Real-time Quiz Platform

Eine moderne, vollständig funktionsfähige Quiz-Plattform mit Echtzeit-Funktionen, entwickelt für den deutschen Sprachraum.

## ✨ Features

### 🔴 Live Quiz Control
- **Real-time Session Management**: Vollständige Kontrolle über Quiz-Sessions
- **Live Timer Control**: Globaler Timer mit Start/Pause/Skip Funktionen
- **Question Navigation**: Vor- und Rückwärts durch Fragen navigieren
- **Session Status**: Live Status-Updates für alle Teilnehmer

### 📊 Live Scoreboard
- **Real-time Leaderboard**: Sofortige Punktestand-Updates
- **Time-based Scoring**: Zeitboni für schnelle Antworten
- **Participant Tracking**: Live-Überwachung aller Teilnehmer
- **Final Results**: Automatische Ergebnisauswertung

### ⏱️ Global Timer
- **Synchronized Timing**: Alle Teilnehmer sehen denselben Timer
- **Flexible Time Settings**: Anpassbare Zeit pro Frage
- **Auto-advance**: Automatischer Übergang zur nächsten Frage
- **Pause/Resume**: Timer kann pausiert und fortgesetzt werden

### 👥 Participant Management
- **Easy Join Process**: Einfacher Beitritt über Quiz-Name oder Code
- **Live Participant List**: Echtzeitliste aller Teilnehmer
- **Connection Status**: Überwachung der Verbindungsstatus
- **Participant Limits**: Konfigurierbare Teilnehmerbegrenzung

## 🚀 Quick Start

### 1. Installation

```bash
# In das Projektverzeichnis wechseln
cd /var/www/quiz-master

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
```

### 2. Server starten

```bash
# Entwicklungsserver starten
npm run dev

# Oder Produktionsserver
npm start
```

### 3. Zugriff

- **Main Application**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Join Quiz**: http://localhost:3000/join
- **API Documentation**: http://localhost:3000/api

## 🛠 Technical Stack

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **Winston** - Logging
- **Helmet** - Security middleware

### Frontend
- **Vanilla JavaScript** - ES6+ modules
- **CSS3** - Modern styling with CSS variables
- **WebSocket API** - Real-time client communication
- **Progressive Web App** - Offline support

### Real-time Features
- **WebSocket Communication** - Bidirectional real-time updates
- **Event-driven Architecture** - Efficient message handling
- **Auto-reconnection** - Robust connection management
- **Session Synchronization** - Consistent state across clients

## 📁 Project Structure

```
quiz-master/
├── 📄 index.html              # Main landing page
├── 📄 package.json            # Node.js dependencies
├── 📄 .env                    # Environment configuration
├── 📁 server/                 # Backend server
│   ├── 📄 app.js             # Main server application
│   ├── 📄 quiz-manager.js    # Quiz management logic
│   ├── 📄 session-manager.js # Session handling
│   └── 📄 websocket-handler.js # WebSocket communication
├── 📁 html/                   # Frontend pages
│   ├── 📄 admin.html         # Admin interface
│   ├── 📄 join.html          # Quiz join page
│   └── 📄 live-control.html  # Live quiz control
├── 📁 css/                    # Stylesheets
│   └── 📄 main.css           # Main stylesheet
├── 📁 js/                     # Frontend JavaScript
│   ├── 📄 main.js            # Core functionality
│   ├── 📄 admin.js           # Admin panel logic
│   ├── 📄 join.js            # Join process
│   ├── 📄 live-control.js    # Live control interface
│   ├── 📄 realtime.js        # WebSocket client
│   └── 📄 config.js          # Configuration
└── 📁 docs/                   # Documentation
```

## 🔧 Configuration

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Security
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Quiz Settings
MAX_PARTICIPANTS_PER_SESSION=100
DEFAULT_QUESTION_TIME=30
```

## 🎮 Usage

### 1. Quiz Creator (Admin)

1. **Öffnen Sie das Admin Panel**: http://localhost:3000/admin
2. **Quiz erstellen**: Fragen hinzufügen, Zeitlimits setzen
3. **Live Session starten**: Quiz für Teilnehmer verfügbar machen
4. **Live Control**: Session in Echtzeit steuern

### 2. Quiz Participants

1. **Join Page öffnen**: http://localhost:3000/join
2. **Quiz-Name eingeben**: Vom Quiz-Ersteller bereitgestellt
3. **Teilnehmen**: Automatische Verbindung zur Live-Session
4. **Quiz absolvieren**: Fragen beantworten mit Live-Timer

### 3. Live Control Features

- ▶️ **Session starten/pausieren**
- ⏭️ **Nächste/vorherige Frage**
- ⏱️ **Timer starten/pausieren/überspringen**
- 📊 **Live Scoreboard überwachen**
- 👥 **Teilnehmer verwalten**

## 🌐 API Endpoints

### Quiz Management
- `GET /api/quizzes` - Alle Quiz abrufen
- `POST /api/quizzes` - Neues Quiz erstellen
- `PUT /api/quizzes/:id` - Quiz aktualisieren
- `DELETE /api/quizzes/:id` - Quiz löschen

### Session Management
- `POST /api/sessions` - Live-Session erstellen
- `POST /api/sessions/:id/start` - Session starten
- `POST /api/sessions/:id/pause` - Session pausieren
- `POST /api/sessions/:id/end` - Session beenden

### WebSocket Events
- `session_started` - Session gestartet
- `question_changed` - Neue Frage
- `timer_update` - Timer-Update
- `participant_joined` - Teilnehmer beigetreten
- `score_update` - Punktestand-Update
- `leaderboard_update` - Leaderboard-Update

## 🧪 Testing

```bash
# Alle Tests ausführen
npm test

# Server-Tests
npm run test:server

# Client-Tests
npm run test:client
```

## 🚀 Deployment

### 1. Produktionsserver

```bash
# Abhängigkeiten installieren
npm install --production

# Umgebung konfigurieren
export NODE_ENV=production
export PORT=80

# Server starten
npm start
```

### 2. Process Manager (PM2)

```bash
# PM2 installieren
npm install -g pm2

# App starten
pm2 start server/app.js --name quizmaster

# Auto-restart konfigurieren
pm2 startup
pm2 save
```

### 3. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🛡️ Security

- **Helmet.js** - HTTP security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API request limiting
- **Input Validation** - Joi schema validation
- **XSS Protection** - Cross-site scripting prevention

## 📊 Monitoring

- **Winston Logging** - Strukturierte Logs
- **Health Check Endpoint** - `/api/health`
- **Performance Metrics** - Response times
- **Error Tracking** - Automatische Fehlerbehandlung

## 🤝 Contributing

1. Fork das Repository
2. Feature Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Änderungen committen (`git commit -m 'Add amazing feature'`)
4. Branch pushen (`git push origin feature/amazing-feature`)
5. Pull Request öffnen

## 📄 License

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](LICENSE) für Details.

## 👨‍💻 Support

- 📧 **Email**: support@quizmaster.com
- 🐙 **GitHub**: [Issues](https://github.com/your-username/quiz-master/issues)
- 📖 **Documentation**: [Wiki](https://github.com/your-username/quiz-master/wiki)

---

**Entwickelt mit ❤️ für die deutsche Quiz-Community**
