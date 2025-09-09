// Real-time WebSocket Service for Live Quiz Sessions (Socket.IO)
import CONFIG from './config.js';

class RealTimeService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = CONFIG.DEFAULTS.RECONNECT_ATTEMPTS;
        this.reconnectDelay = CONFIG.DEFAULTS.RECONNECT_DELAY;
        this.heartbeatInterval = null;
        this.eventHandlers = new Map();
        this.currentSession = null;
        this.participantId = null;
        
        this.setupConnectionStatusHandlers();
    }

    // Connection Management - Updated for Socket.IO
    connect(sessionId = null, participantId = null) {
        if (this.socket && this.isConnected) {
            console.warn('Socket.IO bereits verbunden');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                // Load Socket.IO client library if not already loaded
                if (typeof io === 'undefined') {
                    this.loadSocketIOScript().then(() => {
                        this.initializeSocketConnection(sessionId, participantId, resolve, reject);
                    }).catch(reject);
                } else {
                    this.initializeSocketConnection(sessionId, participantId, resolve, reject);
                }
            } catch (error) {
                console.error('Fehler beim Verbinden:', error);
                reject(error);
            }
        });
    }

    // Load Socket.IO script dynamically
    loadSocketIOScript() {
        return new Promise((resolve, reject) => {
            if (typeof io !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            // Load Socket.IO from the backend server
            const backendUrl = CONFIG.WEBSOCKET_URL.replace('wss://', 'https://').replace('ws://', 'http://');
            script.src = `${backendUrl}/socket.io/socket.io.js`;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Initialize Socket.IO connection
    initializeSocketConnection(sessionId, participantId, resolve, reject) {
        this.socket = io(CONFIG.WEBSOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
            timeout: 10000
        });

        this.currentSession = sessionId;
        this.participantId = participantId;

        this.socket.on('connect', () => {
            console.log('Socket.IO verbunden');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            
            // Join session if provided
            if (sessionId && participantId) {
                this.joinSession(sessionId, participantId);
            }
            
            this.emit('connected');
            resolve();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket.IO getrennt:', reason);
            this.isConnected = false;
            this.stopHeartbeat();
            this.emit('disconnected', { reason });
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket.IO Verbindungsfehler:', error);
            this.reconnectAttempts++;
            this.emit('connection_error', { error, attempts: this.reconnectAttempts });
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                reject(error);
            }
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Socket.IO wiederverbunden nach', attemptNumber, 'Versuchen');
            this.reconnectAttempts = 0;
            this.emit('reconnected', { attempts: attemptNumber });
        });

        // Set up Socket.IO event mapping
        this.setupSocketIOEventMapping();
    }

    // Set up Socket.IO event handlers
    setupSocketIOEventMapping() {
        // Quiz Session Events
        this.socket.on('session_started', (data) => this.handleSessionStarted(data));
        this.socket.on('session_ended', (data) => this.handleSessionEnded(data));
        this.socket.on('participant_joined', (data) => this.handleParticipantJoined(data));
        this.socket.on('participant_left', (data) => this.handleParticipantLeft(data));
        
        // Question Events
        this.socket.on('question_changed', (data) => this.handleQuestionChanged(data));
        this.socket.on('answer_submitted', (data) => this.handleAnswerSubmitted(data));
        
        // Timer Events
        this.socket.on('timer_updated', (data) => this.handleTimerUpdated(data));
        this.socket.on('timer_expired', (data) => this.handleTimerExpired(data));
        
        // Scoring Events
        this.socket.on('score_updated', (data) => this.handleScoreUpdated(data));
        this.socket.on('leaderboard_updated', (data) => this.handleLeaderboardUpdated(data));
        
        // Control Events
        this.socket.on('quiz_paused', (data) => this.handleQuizPaused(data));
        this.socket.on('quiz_resumed', (data) => this.handleQuizResumed(data));
        this.socket.on('quiz_reset', (data) => this.handleQuizReset(data));
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected');
    }

    handleDisconnection() {
        this.isConnected = false;
        this.stopHeartbeat();
        
        // Auto-reconnect logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                console.log(`Versuche Wiederverbindung... Versuch ${this.reconnectAttempts + 1}`);
                if (this.currentSession && this.participantId) {
                    this.connect(this.currentSession, this.participantId);
                } else {
                    this.connect();
                }
            }, this.reconnectDelay);
        } else {
            console.error('Maximale Anzahl der Wiederverbindungsversuche erreicht');
            this.emit('max_reconnect_attempts_reached');
        }
    }

    // Session Management - Updated for Socket.IO
    joinSession(sessionId, participantId) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Session nicht beitreten');
            return;
        }

        this.socket.emit('join_session', { sessionId, participantId });
    }

    leaveSession(sessionId) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Session nicht verlassen');
            return;
        }

        this.socket.emit('leave_session', { sessionId });
    }

    // Quiz Control Methods - Updated for Socket.IO
    startQuizSession(sessionId, quizData) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Quiz nicht starten');
            return;
        }

        this.socket.emit('start_quiz', { sessionId, quizData });
    }

    endQuizSession(sessionId, results) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Quiz nicht beenden');
            return;
        }

        this.socket.emit('end_quiz', { sessionId, results });
    }

    changeQuestion(sessionId, questionData) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Frage nicht wechseln');
            return;
        }

        this.socket.emit('change_question', { sessionId, questionData });
    }

    submitAnswer(sessionId, answerData) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Antwort nicht senden');
            return;
        }

        this.socket.emit('submit_answer', { 
            sessionId, 
            participantId: this.participantId,
            ...answerData 
        });
    }

    updateTimer(sessionId, timeData) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Timer nicht aktualisieren');
            return;
        }

        this.socket.emit('update_timer', { sessionId, timeData });
    }

    updateScore(sessionId, scoreData) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Score nicht aktualisieren');
            return;
        }

        this.socket.emit('update_score', { sessionId, scoreData });
    }

    requestLeaderboard(sessionId) {
        if (!this.isConnected) {
            console.error('Nicht verbunden - kann Rangliste nicht anfordern');
            return;
        }

        this.socket.emit('request_leaderboard', { sessionId });
    }

    // Event Handler Registration
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    off(eventType, handler) {
        if (this.eventHandlers.has(eventType)) {
            const handlers = this.eventHandlers.get(eventType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(eventType, data = null) {
        if (this.eventHandlers.has(eventType)) {
            this.eventHandlers.get(eventType).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Fehler in Event Handler für ${eventType}:`, error);
                }
            });
        }
    }

    // Quiz Session Event Handlers
    handleSessionStarted(data) {
        console.log('Quiz Session gestartet:', data);
        this.emit('session_started', data);
    }

    handleSessionEnded(data) {
        console.log('Quiz Session beendet:', data);
        this.emit('session_ended', data);
    }

    handleParticipantJoined(data) {
        console.log('Teilnehmer beigetreten:', data);
        this.emit('participant_joined', data);
    }

    handleParticipantLeft(data) {
        console.log('Teilnehmer verlassen:', data);
        this.emit('participant_left', data);
    }

    handleQuestionChanged(data) {
        console.log('Frage gewechselt:', data);
        this.emit('question_changed', data);
    }

    handleAnswerSubmitted(data) {
        console.log('Antwort eingereicht:', data);
        this.emit('answer_submitted', data);
    }

    handleTimerUpdated(data) {
        console.log('Timer aktualisiert:', data);
        this.emit('timer_updated', data);
    }

    handleTimerExpired(data) {
        console.log('Timer abgelaufen:', data);
        this.emit('timer_expired', data);
    }

    handleScoreUpdated(data) {
        console.log('Score aktualisiert:', data);
        this.emit('score_updated', data);
    }

    handleLeaderboardUpdated(data) {
        console.log('Rangliste aktualisiert:', data);
        this.emit('leaderboard_updated', data);
    }

    handleQuizPaused(data) {
        console.log('Quiz pausiert:', data);
        this.emit('quiz_paused', data);
    }

    handleQuizResumed(data) {
        console.log('Quiz fortgesetzt:', data);
        this.emit('quiz_resumed', data);
    }

    handleQuizReset(data) {
        console.log('Quiz zurückgesetzt:', data);
        this.emit('quiz_reset', data);
    }

    // Heartbeat Management
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('ping');
            }
        }, CONFIG.DEFAULTS.HEARTBEAT_INTERVAL);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Connection Status Handlers
    setupConnectionStatusHandlers() {
        this.on('connected', () => {
            console.log('✅ Real-time Service verbunden');
        });

        this.on('disconnected', (data) => {
            console.log('❌ Real-time Service getrennt', data);
        });

        this.on('connection_error', (data) => {
            console.error('🔥 Real-time Service Verbindungsfehler', data);
        });

        this.on('reconnected', (data) => {
            console.log('🔄 Real-time Service wiederverbunden', data);
        });
    }

    // Utility Methods
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            currentSession: this.currentSession,
            participantId: this.participantId
        };
    }

    isSessionActive() {
        return this.isConnected && this.currentSession;
    }
}

// Create singleton instance
const realTimeService = new RealTimeService();

export default realTimeService;
