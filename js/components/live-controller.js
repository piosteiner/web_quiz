/**
 * Live Controller Component
 * Handles live quiz session control and monitoring
 */

export class LiveController {
    constructor(app) {
        this.app = app;
        this.cloudAPI = app.getCloudAPI();
        this.realtime = app.getRealtime();
        
        this.sessionId = null;
        this.quiz = null;
        this.currentQuestionIndex = 0;
        this.participants = new Map();
        this.leaderboard = [];
        this.isSessionActive = false;
        this.timer = null;
        this.timeRemaining = 30;
    }

    async init(params = {}) {
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
    }

    // Session Control Methods
    async startSession() {
        if (!this.quiz || !this.quiz.questions || this.quiz.questions.length === 0) {
            this.app.showNotification('Quiz hat keine Fragen', 'error');
            return;
        }

        try {
            await this.cloudAPI.startSession(this.sessionId);
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
            await this.cloudAPI.endSession(this.sessionId);
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
}
