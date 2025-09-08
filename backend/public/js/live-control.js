import CloudAPIService from './cloud-api.js';
import realTimeService from './realtime.js';
import LiveQuizManager from './live-quiz-manager.js';

class LiveQuizController {
    constructor() {
        this.cloudAPI = new CloudAPIService();
        this.realtimeService = realTimeService;  // Use the singleton instance
        this.liveQuizManager = new LiveQuizManager();
        
        this.sessionId = null;
        this.quiz = null;
        this.currentQuestionIndex = 0;
        this.timer = null;
        this.timeRemaining = 30;
        this.participants = new Map();
        this.leaderboard = [];
        this.isSessionActive = false;
        this.isTimerRunning = false;
        
        this.init();
    }

    async init() {
        // Hole Session ID aus URL
        const urlParams = new URLSearchParams(window.location.search);
        this.sessionId = urlParams.get('session');
        
        if (!this.sessionId) {
            alert('Keine Session ID gefunden!');
            window.close();
            return;
        }

        try {
            // Lade Session Daten
            await this.loadSession();
            this.setupEventListeners();
            this.setupRealtimeConnection();
            this.updateUI();
        } catch (error) {
            console.error('Fehler beim Initialisieren der Live Session:', error);
            alert('Fehler beim Laden der Session: ' + error.message);
        }
    }

    async loadSession() {
        try {
            const session = await this.liveQuizManager.getSession(this.sessionId);
            this.quiz = session.quiz;
            this.timeRemaining = session.config.timePerQuestion;
            
            // Update UI mit Quiz-Daten
            document.getElementById('quiz-title').textContent = this.quiz.title;
            document.getElementById('session-id-display').textContent = this.sessionId;
            document.getElementById('time-per-question').value = session.config.timePerQuestion;
            document.getElementById('show-leaderboard').checked = session.config.showLeaderboard;
            
            this.displayCurrentQuestion();
        } catch (error) {
            throw new Error('Session konnte nicht geladen werden: ' + error.message);
        }
    }

    setupEventListeners() {
        // Session Controls
        document.getElementById('start-session-btn').addEventListener('click', () => {
            this.startSession();
        });

        document.getElementById('pause-session-btn').addEventListener('click', () => {
            this.pauseSession();
        });

        document.getElementById('end-session-btn').addEventListener('click', () => {
            this.endSession();
        });

        // Timer Controls
        document.getElementById('start-timer-btn').addEventListener('click', () => {
            this.startTimer();
        });

        document.getElementById('pause-timer-btn').addEventListener('click', () => {
            this.pauseTimer();
        });

        document.getElementById('skip-question-btn').addEventListener('click', () => {
            this.skipQuestion();
        });

        // Question Navigation
        document.getElementById('prev-question-btn').addEventListener('click', () => {
            this.previousQuestion();
        });

        document.getElementById('next-question-btn').addEventListener('click', () => {
            this.nextQuestion();
        });

        // Settings
        document.getElementById('time-per-question').addEventListener('change', (e) => {
            this.updateTimePerQuestion(parseInt(e.target.value));
        });

        document.getElementById('show-leaderboard').addEventListener('change', (e) => {
            this.toggleLeaderboardVisibility(e.target.checked);
        });

        // Join Code Modal
        document.getElementById('copy-join-code').addEventListener('click', () => {
            this.copyToClipboard('join-code');
        });

        document.getElementById('copy-join-url').addEventListener('click', () => {
            this.copyToClipboard('join-url');
        });

        document.getElementById('continue-session').addEventListener('click', () => {
            this.closeJoinModal();
        });

        // Close modal when clicking outside
        document.getElementById('join-code-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeJoinModal();
            }
        });
    }

    setupRealtimeConnection() {
        this.realtimeService.connect();
        
        // Join session channel
        this.realtimeService.joinSession(this.sessionId);

        // Listen for events
        this.realtimeService.on('participantJoined', (data) => {
            this.handleParticipantJoined(data);
        });

        this.realtimeService.on('participantLeft', (data) => {
            this.handleParticipantLeft(data);
        });

        this.realtimeService.on('answerSubmitted', (data) => {
            this.handleAnswerSubmitted(data);
        });

        this.realtimeService.on('connectionStatusChanged', (status) => {
            this.updateConnectionStatus(status);
        });
    }

    async startSession() {
        try {
            await this.liveQuizManager.startSession(this.sessionId);
            this.isSessionActive = true;
            this.updateSessionStatus('active');
            this.showJoinModal();
            
            // Sende Start Event an alle Teilnehmer
            this.realtimeService.emit('sessionStarted', {
                sessionId: this.sessionId,
                quiz: this.quiz,
                currentQuestion: this.currentQuestionIndex
            });
        } catch (error) {
            console.error('Fehler beim Starten der Session:', error);
            alert('Fehler beim Starten der Session: ' + error.message);
        }
    }

    async pauseSession() {
        try {
            await this.liveQuizManager.pauseSession(this.sessionId);
            this.pauseTimer();
            this.updateSessionStatus('paused');
            
            this.realtimeService.emit('sessionPaused', {
                sessionId: this.sessionId
            });
        } catch (error) {
            console.error('Fehler beim Pausieren der Session:', error);
        }
    }

    async endSession() {
        if (confirm('Möchten Sie die Session wirklich beenden? Dies kann nicht rückgängig gemacht werden.')) {
            try {
                await this.liveQuizManager.endSession(this.sessionId);
                this.stopTimer();
                this.updateSessionStatus('ended');
                
                this.realtimeService.emit('sessionEnded', {
                    sessionId: this.sessionId,
                    finalLeaderboard: this.leaderboard
                });

                // Close window after delay
                setTimeout(() => {
                    window.close();
                }, 3000);
            } catch (error) {
                console.error('Fehler beim Beenden der Session:', error);
            }
        }
    }

    startTimer() {
        if (this.isTimerRunning) return;
        
        this.isTimerRunning = true;
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            // Sende Timer Update
            this.realtimeService.emit('timerUpdate', {
                sessionId: this.sessionId,
                timeRemaining: this.timeRemaining
            });
            
            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
        
        this.updateTimerControls();
    }

    pauseTimer() {
        if (!this.isTimerRunning) return;
        
        this.isTimerRunning = false;
        clearInterval(this.timer);
        this.updateTimerControls();
        
        this.realtimeService.emit('timerPaused', {
            sessionId: this.sessionId
        });
    }

    stopTimer() {
        this.isTimerRunning = false;
        clearInterval(this.timer);
        this.updateTimerControls();
    }

    timeUp() {
        this.stopTimer();
        this.showQuestionResults();
        
        this.realtimeService.emit('timeUp', {
            sessionId: this.sessionId,
            questionIndex: this.currentQuestionIndex
        });
        
        // Auto advance if enabled
        if (document.getElementById('auto-advance').checked) {
            setTimeout(() => {
                this.nextQuestion();
            }, 3000);
        }
    }

    skipQuestion() {
        this.stopTimer();
        this.showQuestionResults();
        
        this.realtimeService.emit('questionSkipped', {
            sessionId: this.sessionId,
            questionIndex: this.currentQuestionIndex
        });
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.quiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
            this.resetTimer();
            
            this.realtimeService.emit('nextQuestion', {
                sessionId: this.sessionId,
                questionIndex: this.currentQuestionIndex,
                question: this.quiz.questions[this.currentQuestionIndex]
            });
        } else {
            // Quiz beendet
            this.endQuiz();
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
            this.resetTimer();
        }
    }

    displayCurrentQuestion() {
        const question = this.quiz.questions[this.currentQuestionIndex];
        const questionContent = document.getElementById('question-content');
        
        questionContent.innerHTML = `
            <div class="question-content">
                <div class="question-text">${question.text}</div>
                <div class="question-answers">
                    ${question.answers.map((answer, index) => `
                        <div class="answer-option ${answer.correct ? 'correct' : ''}" data-index="${index}">
                            ${String.fromCharCode(65 + index)}. ${answer.text}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Update progress
        document.getElementById('question-progress').textContent = 
            `${this.currentQuestionIndex + 1} / ${this.quiz.questions.length}`;
        
        // Update current question display
        document.getElementById('current-question').textContent = 
            `${this.currentQuestionIndex + 1}`;
    }

    resetTimer() {
        this.stopTimer();
        this.timeRemaining = parseInt(document.getElementById('time-per-question').value);
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        document.getElementById('timer-display').textContent = this.timeRemaining;
        document.getElementById('remaining-time').textContent = `${this.timeRemaining}s`;
        
        // Update timer circle color based on remaining time
        const circle = document.querySelector('.timer-circle');
        if (this.timeRemaining <= 5) {
            circle.style.borderColor = '#ef4444';
            circle.style.color = '#ef4444';
        } else if (this.timeRemaining <= 10) {
            circle.style.borderColor = '#f59e0b';
            circle.style.color = '#f59e0b';
        } else {
            circle.style.borderColor = 'var(--primary)';
            circle.style.color = 'var(--primary)';
        }
    }

    updateTimerControls() {
        const startBtn = document.getElementById('start-timer-btn');
        const pauseBtn = document.getElementById('pause-timer-btn');
        
        if (this.isTimerRunning) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
        } else {
            startBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
        }
    }

    updateSessionStatus(status) {
        const statusElement = document.getElementById('session-status');
        statusElement.className = `badge badge-${status}`;
        
        switch (status) {
            case 'waiting':
                statusElement.textContent = 'Wartend';
                break;
            case 'active':
                statusElement.textContent = 'Aktiv';
                break;
            case 'paused':
                statusElement.textContent = 'Pausiert';
                break;
            case 'ended':
                statusElement.textContent = 'Beendet';
                break;
        }
    }

    showJoinModal() {
        const quizName = this.quiz.quizName || 'quiz-' + this.sessionId.slice(-6);
        const joinUrl = `${window.location.origin}/join.html?quiz=${quizName}`;
        
        document.getElementById('join-code').textContent = quizName;
        document.getElementById('join-url').value = joinUrl;
        document.getElementById('join-code-modal').classList.add('active');
    }

    closeJoinModal() {
        document.getElementById('join-code-modal').classList.remove('active');
    }

    generateJoinCode() {
        // Generate 6-digit code
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    handleParticipantJoined(data) {
        this.participants.set(data.participantId, data.participant);
        this.updateParticipantCount();
        this.updateParticipantsList();
    }

    handleParticipantLeft(data) {
        this.participants.delete(data.participantId);
        this.updateParticipantCount();
        this.updateParticipantsList();
    }

    handleAnswerSubmitted(data) {
        // Update answer chart
        this.updateAnswerChart(data);
        
        // Update participant score
        const participant = this.participants.get(data.participantId);
        if (participant) {
            participant.score = data.score;
            this.updateLeaderboard();
        }
    }

    updateParticipantCount() {
        document.getElementById('participant-count').textContent = this.participants.size;
    }

    updateParticipantsList() {
        const list = document.getElementById('participants-list');
        
        if (this.participants.size === 0) {
            list.innerHTML = '<div class="empty-participants"><p>Warten auf Teilnehmer...</p></div>';
            return;
        }
        
        list.innerHTML = Array.from(this.participants.values()).map(participant => `
            <div class="participant-item">
                <span>${participant.name}</span>
                <div class="participant-status ${participant.online ? 'online' : 'offline'}"></div>
            </div>
        `).join('');
    }

    updateLeaderboard() {
        // Sort participants by score
        this.leaderboard = Array.from(this.participants.values())
            .filter(p => p.score !== undefined)
            .sort((a, b) => b.score - a.score);
        
        this.renderLeaderboard();
    }

    renderLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        
        if (this.leaderboard.length === 0) {
            list.innerHTML = '<div class="empty-leaderboard"><p>Noch keine Ergebnisse</p></div>';
            return;
        }
        
        list.innerHTML = this.leaderboard.map((participant, index) => `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-name">${participant.name}</span>
                <span class="leaderboard-score">${participant.score} Punkte</span>
            </div>
        `).join('');
    }

    updateAnswerChart(data) {
        // Simple implementation - would be enhanced with actual charting library
        const chart = document.getElementById('answer-chart');
        chart.innerHTML = `
            <div>
                Antwort ${String.fromCharCode(65 + data.answerIndex)} ausgewählt<br>
                Teilnehmer: ${data.participantName}
            </div>
        `;
    }

    showQuestionResults() {
        if (document.getElementById('show-correct-answer').checked) {
            // Highlight correct answers
            document.querySelectorAll('.answer-option').forEach(option => {
                if (option.classList.contains('correct')) {
                    option.style.background = '#ecfdf5';
                    option.style.borderColor = '#10b981';
                }
            });
        }
    }

    async endQuiz() {
        this.updateSessionStatus('ended');
        
        // Send final results
        this.realtimeService.emit('quizEnded', {
            sessionId: this.sessionId,
            finalLeaderboard: this.leaderboard
        });
        
        alert('Quiz beendet! Die Ergebnisse wurden gespeichert.');
    }

    updateTimePerQuestion(time) {
        this.timeRemaining = time;
        this.updateTimerDisplay();
    }

    toggleLeaderboardVisibility(visible) {
        this.realtimeService.emit('leaderboardVisibilityChanged', {
            sessionId: this.sessionId,
            visible: visible
        });
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (status === 'connected') {
            statusElement.className = 'connection-status';
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Verbunden';
        } else {
            statusElement.className = 'connection-status disconnected';
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Getrennt';
        }
    }

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        const text = element.tagName === 'INPUT' ? element.value : element.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            const button = element.parentNode.querySelector('button');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Kopiert!';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        });
    }

    updateUI() {
        this.displayCurrentQuestion();
        this.updateTimerDisplay();
        this.updateParticipantCount();
        this.updateParticipantsList();
        this.renderLeaderboard();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LiveQuizController();
});
