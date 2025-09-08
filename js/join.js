import CloudAPIService from './cloud-api.js';
import realTimeService from './realtime.js';

class QuizParticipant {
    constructor() {
        this.cloudAPI = new CloudAPIService();
        this.realtimeService = realTimeService;  // Use the singleton instance
        
        this.sessionId = null;
        this.participantId = null;
        this.participantName = null;
        this.quiz = null;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.answerTimes = [];
        this.selectedAnswer = null;
        this.isAnswered = false;
        this.timeRemaining = 30;
        this.timer = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupRealtimeConnection();
        
        // Check if joining via URL with quiz name
        const urlParams = new URLSearchParams(window.location.search);
        const quizName = urlParams.get('quiz');
        if (quizName) {
            document.getElementById('quiz-name').value = quizName;
        }
    }

    setupEventListeners() {
        // Join form
        document.getElementById('join-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinSession();
        });

        // Leave session
        document.getElementById('leave-session-btn').addEventListener('click', () => {
            this.leaveSession();
        });

        // Answer selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-option') && !this.isAnswered) {
                this.selectAnswer(e.target);
            }
        });

        // Results actions
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.playAgain();
        });

        document.getElementById('share-results-btn').addEventListener('click', () => {
            this.shareResults();
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (this.sessionId) {
                this.leaveSession();
            }
        });
    }

    setupRealtimeConnection() {
        this.realtimeService.connect();
        
        // Listen for connection status
        this.realtimeService.on('connectionStatusChanged', (status) => {
            this.updateConnectionStatus(status);
        });

        // Listen for session events
        this.realtimeService.on('sessionStarted', (data) => {
            this.handleSessionStarted(data);
        });

        this.realtimeService.on('sessionPaused', (data) => {
            this.handleSessionPaused(data);
        });

        this.realtimeService.on('sessionEnded', (data) => {
            this.handleSessionEnded(data);
        });

        this.realtimeService.on('nextQuestion', (data) => {
            this.handleNextQuestion(data);
        });

        this.realtimeService.on('timerUpdate', (data) => {
            this.handleTimerUpdate(data);
        });

        this.realtimeService.on('timerPaused', (data) => {
            this.handleTimerPaused(data);
        });

        this.realtimeService.on('timeUp', (data) => {
            this.handleTimeUp(data);
        });

        this.realtimeService.on('questionSkipped', (data) => {
            this.handleQuestionSkipped(data);
        });

        this.realtimeService.on('quizEnded', (data) => {
            this.handleQuizEnded(data);
        });

        this.realtimeService.on('participantJoined', (data) => {
            this.handleParticipantUpdate(data);
        });

        this.realtimeService.on('participantLeft', (data) => {
            this.handleParticipantUpdate(data);
        });
    }

    async joinSession() {
        const name = document.getElementById('participant-name').value.trim();
        const quizName = document.getElementById('quiz-name').value.trim();

        if (!name || !quizName) {
            this.showNotification('Bitte füllen Sie alle Felder aus', 'error');
            return;
        }

        try {
            // Join quiz by name
            const sessionData = await this.cloudAPI.joinQuizByName(quizName, name);
            
            this.sessionId = sessionData.sessionId;
            this.participantId = sessionData.participantId;
            this.participantName = name;
            this.quiz = sessionData.quiz;
            
            // Join realtime channel
            this.realtimeService.joinSession(this.sessionId);
            
            // Update UI
            document.getElementById('display-name').textContent = name;
            document.getElementById('waiting-quiz-title').textContent = this.quiz.title;
            
            this.switchScreen('waiting-screen');
            this.showNotification('Erfolgreich beigetreten!', 'success');
            
        } catch (error) {
            console.error('Fehler beim Beitreten:', error);
            this.showNotification('Fehler beim Beitreten: ' + error.message, 'error');
        }
    }

    async leaveSession() {
        if (confirm('Möchten Sie die Session wirklich verlassen?')) {
            try {
                if (this.sessionId) {
                    await this.cloudAPI.leaveSession(this.sessionId, this.participantId);
                    this.realtimeService.leaveSession(this.sessionId);
                }
                
                this.resetSession();
                this.switchScreen('join-screen');
                this.showNotification('Session verlassen', 'info');
            } catch (error) {
                console.error('Fehler beim Verlassen:', error);
            }
        }
    }

    resetSession() {
        this.sessionId = null;
        this.participantId = null;
        this.participantName = null;
        this.quiz = null;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.answerTimes = [];
        this.selectedAnswer = null;
        this.isAnswered = false;
        this.stopTimer();
        
        // Reset form
        document.getElementById('join-form').reset();
    }

    handleSessionStarted(data) {
        this.quiz = data.quiz;
        this.currentQuestionIndex = data.currentQuestion;
        
        document.getElementById('quiz-title').textContent = this.quiz.title;
        document.getElementById('total-questions').textContent = this.quiz.questions.length;
        
        this.switchScreen('quiz-screen');
        this.displayCurrentQuestion();
        this.showNotification('Quiz gestartet!', 'success');
    }

    handleSessionPaused(data) {
        this.stopTimer();
        this.showNotification('Quiz pausiert', 'info');
        document.getElementById('session-status-display').textContent = 'Pausiert';
        document.getElementById('session-status-display').className = 'badge badge-paused';
    }

    handleSessionEnded(data) {
        this.stopTimer();
        this.showNotification('Session beendet', 'info');
        this.switchScreen('waiting-screen');
    }

    handleNextQuestion(data) {
        this.currentQuestionIndex = data.questionIndex;
        this.isAnswered = false;
        this.selectedAnswer = null;
        this.displayCurrentQuestion();
    }

    handleTimerUpdate(data) {
        this.timeRemaining = data.timeRemaining;
        this.updateTimerDisplay();
    }

    handleTimerPaused(data) {
        this.stopTimer();
    }

    handleTimeUp(data) {
        this.timeUp();
    }

    handleQuestionSkipped(data) {
        this.timeUp();
    }

    handleQuizEnded(data) {
        this.displayResults(data.finalLeaderboard);
    }

    handleParticipantUpdate(data) {
        // Update participant counter in waiting screen
        if (data.participantCount !== undefined) {
            document.getElementById('participant-counter').textContent = data.participantCount;
        }
    }

    displayCurrentQuestion() {
        const question = this.quiz.questions[this.currentQuestionIndex];
        
        document.getElementById('question-number').textContent = this.currentQuestionIndex + 1;
        document.getElementById('question-text').textContent = question.text;
        document.getElementById('current-score').textContent = this.score;
        
        // Create answer options
        const optionsContainer = document.getElementById('answer-options');
        optionsContainer.innerHTML = '';
        
        question.answers.forEach((answer, index) => {
            const option = document.createElement('div');
            option.className = 'answer-option';
            option.dataset.index = index;
            option.innerHTML = `
                <span class="answer-label">${String.fromCharCode(65 + index)}</span>
                ${answer.text}
            `;
            optionsContainer.appendChild(option);
        });
        
        // Hide feedback
        document.getElementById('answer-feedback').style.display = 'none';
        
        // Reset timer display
        this.updateTimerDisplay();
    }

    selectAnswer(element) {
        if (this.isAnswered) return;
        
        // Remove previous selection
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Mark as selected
        element.classList.add('selected');
        this.selectedAnswer = parseInt(element.dataset.index);
        
        // Submit answer immediately
        this.submitAnswer();
    }

    async submitAnswer() {
        if (this.isAnswered || this.selectedAnswer === null) return;
        
        this.isAnswered = true;
        const answerTime = Date.now();
        const question = this.quiz.questions[this.currentQuestionIndex];
        const isCorrect = question.answers[this.selectedAnswer].correct;
        
        // Calculate points (time bonus)
        const timeBonus = Math.max(0, this.timeRemaining);
        const points = isCorrect ? (100 + timeBonus) : 0;
        this.score += points;
        
        // Update statistics
        if (isCorrect) {
            this.correctAnswers++;
        } else {
            this.incorrectAnswers++;
        }
        
        this.answerTimes.push(30 - this.timeRemaining);
        
        // Update UI
        this.showAnswerFeedback(isCorrect, points);
        this.disableAnswerOptions();
        
        try {
            // Submit to server
            await this.cloudAPI.submitAnswer(this.sessionId, this.participantId, {
                questionIndex: this.currentQuestionIndex,
                answerIndex: this.selectedAnswer,
                isCorrect: isCorrect,
                points: points,
                answerTime: answerTime,
                score: this.score
            });
            
            // Emit realtime event
            this.realtimeService.emit('answerSubmitted', {
                sessionId: this.sessionId,
                participantId: this.participantId,
                participantName: this.participantName,
                questionIndex: this.currentQuestionIndex,
                answerIndex: this.selectedAnswer,
                isCorrect: isCorrect,
                score: this.score
            });
            
        } catch (error) {
            console.error('Fehler beim Übermitteln der Antwort:', error);
        }
    }

    showAnswerFeedback(isCorrect, points) {
        const feedback = document.getElementById('answer-feedback');
        
        if (isCorrect) {
            feedback.className = 'answer-feedback correct';
            feedback.innerHTML = `<i class="fas fa-check"></i> Richtig! +${points} Punkte`;
        } else {
            feedback.className = 'answer-feedback incorrect';
            feedback.innerHTML = `<i class="fas fa-times"></i> Falsch! Richtige Antwort wird angezeigt`;
        }
        
        feedback.style.display = 'block';
        
        // Highlight correct answer
        const options = document.querySelectorAll('.answer-option');
        const question = this.quiz.questions[this.currentQuestionIndex];
        
        question.answers.forEach((answer, index) => {
            if (answer.correct) {
                options[index].classList.add('correct');
            } else if (index === this.selectedAnswer && !isCorrect) {
                options[index].classList.add('incorrect');
            }
        });
    }

    disableAnswerOptions() {
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.add('disabled');
        });
    }

    timeUp() {
        if (!this.isAnswered) {
            // Auto-submit no answer
            this.isAnswered = true;
            this.showAnswerFeedback(false, 0);
            this.disableAnswerOptions();
            this.incorrectAnswers++;
        }
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById('timer-countdown');
        const timerCircle = document.querySelector('.timer-circle');
        
        if (timerElement) {
            timerElement.textContent = this.timeRemaining;
        }
        
        if (timerCircle) {
            timerCircle.className = 'timer-circle';
            
            if (this.timeRemaining <= 5) {
                timerCircle.classList.add('danger');
            } else if (this.timeRemaining <= 10) {
                timerCircle.classList.add('warning');
            }
        }
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    displayResults(leaderboard) {
        this.switchScreen('results-screen');
        
        // Show personal stats
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('correct-answers').textContent = this.correctAnswers;
        document.getElementById('incorrect-answers').textContent = this.incorrectAnswers;
        
        // Calculate rank
        const rank = leaderboard.findIndex(p => p.participantId === this.participantId) + 1;
        document.getElementById('final-rank').textContent = rank > 0 ? `#${rank}` : '-';
        
        // Calculate average time
        const avgTime = this.answerTimes.length > 0 
            ? (this.answerTimes.reduce((a, b) => a + b, 0) / this.answerTimes.length).toFixed(1)
            : '-';
        document.getElementById('average-time').textContent = avgTime !== '-' ? `${avgTime}s` : '-';
        
        // Show leaderboard
        this.renderFinalLeaderboard(leaderboard);
        
        this.showNotification('Quiz beendet! Ergebnisse anzeigen', 'success');
    }

    renderFinalLeaderboard(leaderboard) {
        const container = document.getElementById('final-leaderboard');
        
        container.innerHTML = leaderboard.slice(0, 10).map((participant, index) => `
            <div class="leaderboard-item ${participant.participantId === this.participantId ? 'highlight' : ''}">
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-name">${participant.name}</span>
                <span class="leaderboard-score">${participant.score} Punkte</span>
            </div>
        `).join('');
    }

    playAgain() {
        this.resetSession();
        this.switchScreen('join-screen');
    }

    shareResults() {
        const text = `Ich habe ${this.score} Punkte im Quiz "${this.quiz.title}" erreicht! 🎉`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Meine Quiz-Ergebnisse',
                text: text,
                url: window.location.origin
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Ergebnis in Zwischenablage kopiert!', 'success');
            });
        }
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    updateConnectionStatus(status) {
        const indicator = document.getElementById('connection-indicator');
        
        if (status === 'connected') {
            indicator.className = 'connection-indicator';
            indicator.innerHTML = '<i class="fas fa-wifi"></i>';
        } else {
            indicator.className = 'connection-indicator disconnected';
            indicator.innerHTML = '<i class="fas fa-wifi"></i>';
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizParticipant();
});
