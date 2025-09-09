/**
 * Live Controller Component
 * Handles live quiz session control and monitoring
 */

import { BaseComponent } from '../utils/base-component.js';

export class LiveController extends BaseComponent {
    constructor(app) {
        super(app);
        
        this.sessionId = null;
        this.quiz = null;
        this.currentQuestionIndex = 0;
        this.participants = new Map();
        this.leaderboard = [];
        this.isSessionActive = false;
        
        // Enhanced timer system
        this.questionTimer = null;
        this.countdownTimer = null;
        this.timeRemaining = 0;
        this.questionTimeLimit = 30; // seconds
        this.isQuestionActive = false;
        this.isCountdownActive = false;
        this.questionStartTime = null;
        this.isPaused = false;
        this.pausedTime = 0;
        
        // Auto-save timeout
        this.autoSaveTimeout = null;
    }

    async onInit(params = {}) {
        console.log('📡 Initializing Live Controller');
        
        this.sessionId = params.sessionId || this.app.getState().session?.id;
        
        if (!this.sessionId) {
            this.app.showNotification('Keine Session ID gefunden', 'error');
            this.app.navigateTo('admin');
            return;
        }
        
        this.setupEventListeners();
        this.setupRealtimeEvents();
        await this.loadSessionData();
        this.renderLiveControl();
    }

    setupEventListeners() {
        // Session control buttons will be added dynamically
        document.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;
            
            switch (action) {
                case 'start-session':
                    this.startSession();
                    break;
                case 'pause-session':
                    this.pauseSession();
                    break;
                case 'resume-session':
                    this.resumeSession();
                    break;
                case 'next-question':
                    this.nextQuestion();
                    break;
                case 'prev-question':
                    this.prevQuestion();
                    break;
                case 'end-session':
                    this.endSession();
                    break;
                    
                // New question control actions
                case 'show-question':
                    this.showCurrentQuestion();
                    break;
                case 'pause-timer':
                    this.pauseQuestionTimer();
                    break;
                case 'resume-timer':
                    this.resumeQuestionTimer();
                    break;
                case 'restart-timer':
                    this.restartQuestionTimer();
                    break;
                case 'close-question':
                    this.closeCurrentQuestion();
                    break;
                case 'copy-join-url':
                    this.copyJoinURL();
                    break;
            }
        });
    }

    setupRealtimeEvents() {
        this.realtime.on('participant_joined', (data) => this.handleParticipantJoined(data));
        this.realtime.on('participant_left', (data) => this.handleParticipantLeft(data));
        this.realtime.on('answer_submitted', (data) => this.handleAnswerSubmitted(data));
        this.realtime.on('timer_update', (data) => this.handleTimerUpdate(data));
    }

    async loadSessionData() {
        this.app.showLoading('Lade Session-Daten...');
        
        try {
            const session = this.app.getState().session;
            if (session) {
                this.quiz = session.quiz;
            }
            
            // Connect to realtime
            await this.realtime.connect(this.sessionId);
            
            this.app.hideLoading();
            
        } catch (error) {
            this.app.hideLoading();
            this.app.showNotification(`Fehler beim Laden: ${error.message}`, 'error');
        }
    }

    renderLiveControl() {
        const container = document.getElementById('live-control-content');
        if (!container) return;

        container.innerHTML = `
            <div class="live-control-dashboard">
                <!-- Session Info -->
                <div class="session-info-card">
                    <h3>${this.quiz?.title || 'Quiz Session'}</h3>
                    <div class="session-stats">
                        <div class="stat">
                            <span class="stat-value" id="participant-count">0</span>
                            <span class="stat-label">Teilnehmer</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value" id="current-question-display">${this.currentQuestionIndex + 1}</span>
                            <span class="stat-label">Aktuelle Frage</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value" id="session-timer">00:00</span>
                            <span class="stat-label">Session Zeit</span>
                        </div>
                    </div>
                </div>

                <!-- Question Timer & Countdown Display -->
                <div class="timer-display-card">
                    <h4>Question Timer</h4>
                    
                    <!-- Countdown Display -->
                    <div id="admin-countdown-display" class="countdown-display" style="display: none;">
                        <div class="countdown-number">5</div>
                    </div>
                    
                    <!-- Question Timer Display -->
                    <div id="admin-timer-display" class="timer-display">
                        <div class="timer-main">--:--</div>
                        <div class="timer-ms">.0</div>
                    </div>
                    
                    <!-- Timer Status -->
                    <div class="timer-status">
                        <span id="timer-status-text">Bereit</span>
                    </div>
                </div>

                <!-- Question Controls -->
                <div class="question-controls-card">
                    <h4>Fragen Steuerung</h4>
                    <div class="control-buttons question-control-buttons">
                        <button class="btn btn-primary" data-action="show-question" id="show-question-btn">
                            <i class="fas fa-eye"></i> Frage anzeigen
                        </button>
                        <button class="btn btn-warning" data-action="pause-timer" id="pause-timer-btn" disabled>
                            <i class="fas fa-pause"></i> Timer pausieren
                        </button>
                        <button class="btn btn-success" data-action="resume-timer" id="resume-timer-btn" disabled>
                            <i class="fas fa-play"></i> Timer fortsetzen
                        </button>
                        <button class="btn btn-info" data-action="restart-timer" id="restart-timer-btn" disabled>
                            <i class="fas fa-redo"></i> Timer neu starten
                        </button>
                        <button class="btn btn-danger" data-action="close-question" id="close-question-btn" disabled>
                            <i class="fas fa-times"></i> Frage schließen
                        </button>
                    </div>
                </div>

                <!-- Session Controls -->
                <div class="session-controls-card">
                    <h4>Session Control</h4>
                    <div class="control-buttons">
                        <button class="btn btn-success" data-action="start-session" id="start-btn">
                            <i class="fas fa-play"></i> Session starten
                        </button>
                        <button class="btn btn-warning" data-action="pause-session" id="pause-btn" disabled>
                            <i class="fas fa-pause"></i> Pausieren
                        </button>
                        <button class="btn btn-danger" data-action="end-session" id="end-btn" disabled>
                            <i class="fas fa-stop"></i> Beenden
                        </button>
                    </div>
                </div>

                <!-- Question Navigation -->
                <div class="question-nav-card">
                    <h4>Fragen Navigation</h4>
                    <div class="question-controls">
                        <button class="btn btn-outline" data-action="prev-question" id="prev-btn" disabled>
                            <i class="fas fa-chevron-left"></i> Vorherige
                        </button>
                        <span class="question-indicator">
                            Frage <span id="question-nav-current">1</span> von <span id="question-nav-total">${this.quiz?.questions?.length || 0}</span>
                        </span>
                        <button class="btn btn-outline" data-action="next-question" id="next-btn" disabled>
                            <i class="fas fa-chevron-right"></i> Nächste
                        </button>
                    </div>
                    
                    <!-- Current Question Preview -->
                    <div class="current-question-preview">
                        <h5 id="preview-question-text">Warten auf Session Start...</h5>
                        <div id="preview-answers" class="preview-answers">
                            <!-- Question answers will be shown here -->
                        </div>
                    </div>
                </div>

                <!-- Join Information -->
                <div class="join-info-card">
                    <h4>Beitreten Information</h4>
                    <div class="join-details">
                        <div class="join-url-section">
                            <label>Join URL:</label>
                            <div class="url-input-group">
                                <input type="text" id="join-url-input" readonly 
                                       value="${window.location.origin}/#join?quiz=${encodeURIComponent(this.quiz?.title || 'quiz')}">
                                <button class="btn btn-outline" data-action="copy-join-url">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        <div class="join-qr-code">
                            <!-- QR Code would go here -->
                            <div class="qr-placeholder">
                                <i class="fas fa-qrcode"></i>
                                <p>QR Code</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Participants List -->
                <div class="participants-card">
                    <h4>Teilnehmer (<span id="participants-count">0</span>)</h4>
                    <div id="participants-list" class="participants-list">
                        <div class="no-participants">
                            <i class="fas fa-users"></i>
                            <p>Warten auf Teilnehmer...</p>
                        </div>
                    </div>
                </div>

                <!-- Live Leaderboard -->
                <div class="leaderboard-card">
                    <h4>Live Bestenliste</h4>
                    <div id="live-leaderboard" class="live-leaderboard">
                        <div class="no-scores">
                            <i class="fas fa-trophy"></i>
                            <p>Noch keine Antworten...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateQuestionPreview();
        this.updateAdminControls();
    }

    // Session Control Methods
    async startSession() {
        if (!this.quiz || !this.quiz.questions || this.quiz.questions.length === 0) {
            this.app.showNotification('Quiz hat keine Fragen', 'error');
            return;
        }

        try {
            await this.api.startSession(this.sessionId);
            this.isSessionActive = true;
            this.currentQuestionIndex = 0;
            
            this.updateControlButtons();
            this.updateQuestionPreview();
            this.startQuestionTimer();
            
            this.app.showNotification('Session gestartet!', 'success');
            
        } catch (error) {
            this.app.showNotification(`Fehler beim Starten: ${error.message}`, 'error');
        }
    }

    async pauseSession() {
        // Implement pause functionality
        this.app.showNotification('Session pausiert', 'info');
    }

    async resumeSession() {
        // Implement resume functionality
        this.app.showNotification('Session fortgesetzt', 'info');
    }

    async endSession() {
        if (!confirm('Session wirklich beenden?')) {
            return;
        }

        try {
            await this.api.endSession(this.sessionId);
            this.isSessionActive = false;
            this.stopQuestionTimer();
            
            this.updateControlButtons();
            this.app.showNotification('Session beendet', 'info');
            
            // Navigate back to admin
            setTimeout(() => {
                this.app.navigateTo('admin');
            }, 2000);
            
        } catch (error) {
            this.app.showNotification(`Fehler beim Beenden: ${error.message}`, 'error');
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.quiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.updateQuestionPreview();
            this.updateQuestionNavigation();
            this.startQuestionTimer();
            
            // Broadcast question change
            this.realtime.emit('question_changed', {
                sessionId: this.sessionId,
                questionIndex: this.currentQuestionIndex,
                question: this.quiz.questions[this.currentQuestionIndex]
            });
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.updateQuestionPreview();
            this.updateQuestionNavigation();
            this.startQuestionTimer();
        }
    }

    // Timer Management
    startQuestionTimer() {
        this.stopQuestionTimer();
        this.timeRemaining = 30;
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            
            // Broadcast timer update
            this.realtime.emit('timer_update', {
                sessionId: this.sessionId,
                timeRemaining: this.timeRemaining
            });
            
            if (this.timeRemaining <= 0) {
                this.handleTimerExpired();
            }
        }, 1000);
    }

    stopQuestionTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    handleTimerExpired() {
        this.stopQuestionTimer();
        
        // Broadcast timer expired
        this.realtime.emit('timer_expired', {
            sessionId: this.sessionId,
            questionIndex: this.currentQuestionIndex
        });
        
        // Auto advance to next question after a delay
        setTimeout(() => {
            if (this.currentQuestionIndex < this.quiz.questions.length - 1) {
                this.nextQuestion();
            } else {
                this.endSession();
            }
        }, 3000);
    }

    // UI Update Methods
    updateControlButtons() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const endBtn = document.getElementById('end-btn');
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');

        if (this.isSessionActive) {
            if (startBtn) startBtn.disabled = true;
            if (pauseBtn) pauseBtn.disabled = false;
            if (endBtn) endBtn.disabled = false;
            if (nextBtn) nextBtn.disabled = false;
            if (prevBtn) prevBtn.disabled = false;
        } else {
            if (startBtn) startBtn.disabled = false;
            if (pauseBtn) pauseBtn.disabled = true;
            if (endBtn) endBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            if (prevBtn) prevBtn.disabled = true;
        }
        
        this.updateQuestionNavigation();
    }

    updateQuestionNavigation() {
        const currentSpan = document.getElementById('question-nav-current');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (currentSpan) {
            currentSpan.textContent = this.currentQuestionIndex + 1;
        }
        
        if (prevBtn) {
            prevBtn.disabled = !this.isSessionActive || this.currentQuestionIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = !this.isSessionActive || this.currentQuestionIndex >= this.quiz.questions.length - 1;
        }
    }

    updateQuestionPreview() {
        if (!this.quiz || !this.quiz.questions[this.currentQuestionIndex]) {
            return;
        }

        const question = this.quiz.questions[this.currentQuestionIndex];
        const questionText = document.getElementById('preview-question-text');
        const answersContainer = document.getElementById('preview-answers');

        if (questionText) {
            questionText.textContent = question.text;
        }

        if (answersContainer) {
            answersContainer.innerHTML = question.answers.map((answer, index) => `
                <div class="preview-answer ${answer.correct ? 'correct' : ''}">
                    <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
                    <span class="answer-text">${answer.text}</span>
                    ${answer.correct ? '<i class="fas fa-check"></i>' : ''}
                </div>
            `).join('');
        }
    }

    // Event Handlers
    handleParticipantJoined(data) {
        this.participants.set(data.participantId, data);
        this.updateParticipantsList();
        
        const count = document.getElementById('participant-count');
        if (count) count.textContent = this.participants.size;
    }

    handleParticipantLeft(data) {
        this.participants.delete(data.participantId);
        this.updateParticipantsList();
        
        const count = document.getElementById('participant-count');
        if (count) count.textContent = this.participants.size;
    }

    handleAnswerSubmitted(data) {
        // Update leaderboard
        this.updateLeaderboard(data);
    }

    handleTimerUpdate(data) {
        // Timer updates are sent by this controller
    }

    updateParticipantsList() {
        const container = document.getElementById('participants-list');
        if (!container) return;

        if (this.participants.size === 0) {
            container.innerHTML = `
                <div class="no-participants">
                    <i class="fas fa-users"></i>
                    <p>Warten auf Teilnehmer...</p>
                </div>
            `;
            return;
        }

        container.innerHTML = Array.from(this.participants.values()).map(participant => `
            <div class="participant-item">
                <div class="participant-info">
                    <span class="participant-name">${participant.name}</span>
                    <span class="participant-status">${participant.status || 'Verbunden'}</span>
                </div>
                <div class="participant-score">
                    ${participant.score || 0} Punkte
                </div>
            </div>
        `).join('');
    }

    updateLeaderboard(answerData) {
        // Update participant score
        const participant = this.participants.get(answerData.participantId);
        if (participant) {
            participant.score = answerData.score;
        }

        // Update leaderboard display
        const leaderboard = Array.from(this.participants.values())
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 10);

        const container = document.getElementById('live-leaderboard');
        if (container) {
            container.innerHTML = leaderboard.map((participant, index) => `
                <div class="leaderboard-item">
                    <span class="rank">#${index + 1}</span>
                    <span class="name">${participant.name}</span>
                    <span class="score">${participant.score || 0}</span>
                </div>
            `).join('');
        }
    }

    // Utility Methods
    copyJoinURL() {
        const urlInput = document.getElementById('join-url-input');
        if (urlInput) {
            urlInput.select();
            navigator.clipboard.writeText(urlInput.value).then(() => {
                this.app.showNotification('Join URL kopiert!', 'success');
            }).catch(() => {
                this.app.showNotification('Kopieren fehlgeschlagen', 'error');
            });
        }
    }

    // Question Control Methods
    async showCurrentQuestion() {
        if (!this.quiz?.questions[this.currentQuestionIndex]) {
            this.app.showNotification('Keine Frage verfügbar', 'error');
            return;
        }

        if (this.isCountdownActive || this.isQuestionActive) {
            this.app.showNotification('Eine Frage ist bereits aktiv', 'warning');
            return;
        }

        // Get question time limit from quiz settings or default
        this.questionTimeLimit = this.quiz.settings?.timePerQuestion || 30;
        
        // Start 5-second countdown
        await this.startQuestionCountdown();
    }

    async startQuestionCountdown() {
        this.isCountdownActive = true;
        let countdown = 5;

        // Notify all participants about countdown start
        this.realtime.emit('countdown-start', {
            sessionId: this.sessionId,
            countdown: countdown
        });

        // Update admin interface
        this.updateCountdownDisplay(countdown);

        // Start countdown timer
        this.countdownTimer = setInterval(() => {
            countdown--;
            
            if (countdown > 0) {
                // Update countdown on all interfaces
                this.realtime.emit('countdown-tick', {
                    sessionId: this.sessionId,
                    countdown: countdown
                });
                this.updateCountdownDisplay(countdown);
            } else {
                // Countdown finished, start question
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                this.isCountdownActive = false;
                this.startQuestionTimer();
            }
        }, 1000);

        // Auto-save session state
        await this.saveSessionStateToServer();
    }

    startQuestionTimer() {
        this.isQuestionActive = true;
        this.isPaused = false;
        this.pausedTime = 0;
        this.questionStartTime = Date.now();
        this.timeRemaining = this.questionTimeLimit;

        // Notify all participants that question is now active
        this.realtime.emit('question-start', {
            sessionId: this.sessionId,
            questionIndex: this.currentQuestionIndex,
            question: this.quiz.questions[this.currentQuestionIndex],
            timeLimit: this.questionTimeLimit,
            startTime: this.questionStartTime
        });

        // Start timer for admin interface
        this.questionTimer = setInterval(() => {
            if (!this.isPaused) {
                const elapsed = Math.floor((Date.now() - this.questionStartTime - this.pausedTime) / 1000);
                this.timeRemaining = Math.max(0, this.questionTimeLimit - elapsed);

                // Update admin interface
                this.updateTimerDisplay();

                // Broadcast timer update to participants
                this.realtime.emit('timer-update', {
                    sessionId: this.sessionId,
                    timeRemaining: this.timeRemaining,
                    isLastTenSeconds: this.timeRemaining <= 10
                });

                // Auto-close question when time runs out
                if (this.timeRemaining <= 0) {
                    this.timeoutQuestion();
                }
            }
        }, 100); // Update every 100ms for smooth display
    }

    pauseQuestionTimer() {
        if (!this.isQuestionActive || this.isPaused) return;

        this.isPaused = true;
        this.pauseStartTime = Date.now();

        // Notify participants
        this.realtime.emit('timer-pause', {
            sessionId: this.sessionId,
            timeRemaining: this.timeRemaining
        });

        // Update admin interface
        this.updateAdminControls();
        this.app.showNotification('Timer pausiert', 'info');
    }

    resumeQuestionTimer() {
        if (!this.isQuestionActive || !this.isPaused) return;

        this.pausedTime += Date.now() - this.pauseStartTime;
        this.isPaused = false;

        // Notify participants
        this.realtime.emit('timer-resume', {
            sessionId: this.sessionId,
            timeRemaining: this.timeRemaining
        });

        // Update admin interface
        this.updateAdminControls();
        this.app.showNotification('Timer fortgesetzt', 'info');
    }

    async restartQuestionTimer() {
        if (!this.isQuestionActive) return;

        // Clear existing timer
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }

        // Reset and restart
        this.isPaused = false;
        this.pausedTime = 0;
        this.questionStartTime = Date.now();
        this.timeRemaining = this.questionTimeLimit;

        // Notify participants
        this.realtime.emit('timer-restart', {
            sessionId: this.sessionId,
            timeLimit: this.questionTimeLimit,
            startTime: this.questionStartTime
        });

        // Restart timer
        this.startQuestionTimer();
        this.app.showNotification('Timer neu gestartet', 'info');

        // Auto-save session state
        await this.saveSessionStateToServer();
    }

    async closeCurrentQuestion() {
        if (!this.isQuestionActive) return;

        // Clear timers
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }

        this.isQuestionActive = false;
        this.isPaused = false;

        // Notify participants that question is closed
        this.realtime.emit('question-close', {
            sessionId: this.sessionId,
            questionIndex: this.currentQuestionIndex,
            correctAnswer: this.quiz.questions[this.currentQuestionIndex].answers.find(a => a.correct)
        });

        // Update admin interface
        this.updateAdminControls();
        this.updateTimerDisplay();
        this.app.showNotification('Frage geschlossen', 'success');

        // Auto-save session state
        await this.saveSessionStateToServer();
    }

    timeoutQuestion() {
        // Question time has run out
        this.realtime.emit('question-timeout', {
            sessionId: this.sessionId,
            questionIndex: this.currentQuestionIndex,
            correctAnswer: this.quiz.questions[this.currentQuestionIndex].answers.find(a => a.correct)
        });

        this.closeCurrentQuestion();
    }

    // UI Update Methods
    updateCountdownDisplay(countdown) {
        const countdownElement = document.getElementById('admin-countdown-display');
        if (countdownElement) {
            countdownElement.innerHTML = countdown > 0 ? 
                `<div class="countdown-number">${countdown}</div>` : 
                '<div class="countdown-finished">START!</div>';
            countdownElement.style.display = countdown > 0 ? 'block' : 'none';
        }
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById('admin-timer-display');
        if (timerElement) {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            const milliseconds = Math.floor((this.timeRemaining * 1000) % 1000);
            
            timerElement.innerHTML = `
                <div class="timer-main">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                <div class="timer-ms">.${Math.floor(milliseconds / 100)}</div>
            `;
            
            // Add visual warning for last 10 seconds
            if (this.timeRemaining <= 10 && this.timeRemaining > 0) {
                timerElement.classList.add('timer-warning');
            } else {
                timerElement.classList.remove('timer-warning');
            }
        }
    }

    updateAdminControls() {
        const showBtn = document.querySelector('[data-action="show-question"]');
        const pauseBtn = document.querySelector('[data-action="pause-timer"]');
        const resumeBtn = document.querySelector('[data-action="resume-timer"]');
        const restartBtn = document.querySelector('[data-action="restart-timer"]');
        const closeBtn = document.querySelector('[data-action="close-question"]');

        if (showBtn) showBtn.disabled = this.isQuestionActive || this.isCountdownActive;
        if (pauseBtn) pauseBtn.disabled = !this.isQuestionActive || this.isPaused;
        if (resumeBtn) resumeBtn.disabled = !this.isQuestionActive || !this.isPaused;
        if (restartBtn) restartBtn.disabled = !this.isQuestionActive;
        if (closeBtn) closeBtn.disabled = !this.isQuestionActive;
    }

    // Auto-save helper
    async saveSessionStateToServer() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(async () => {
            try {
                const sessionState = {
                    sessionId: this.sessionId,
                    currentQuestionIndex: this.currentQuestionIndex,
                    isQuestionActive: this.isQuestionActive,
                    isCountdownActive: this.isCountdownActive,
                    questionStartTime: this.questionStartTime,
                    timeRemaining: this.timeRemaining,
                    isPaused: this.isPaused,
                    pausedTime: this.pausedTime,
                    participants: Array.from(this.participants.values())
                };

                await this.api.updateSessionState(this.sessionId, sessionState);
                console.log('✅ Session state auto-saved');
            } catch (error) {
                console.warn('Session state auto-save failed:', error.message);
            }
        }, 1000); // Auto-save after 1 second
    }
}
