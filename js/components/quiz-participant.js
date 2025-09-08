/**
 * Quiz Participant Component
 * Handles joining quizzes and participating in live sessions
 */

export class QuizParticipant {
    constructor(app) {
        this.app = app;
        this.cloudAPI = app.getCloudAPI();
        this.realtime = app.getRealtime();
        
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
    }

    async init(params = {}) {
        console.log('🎯 Initializing Quiz Participant');
        
        this.setupEventListeners();
        this.setupRealtimeEvents();
        
        // Pre-fill quiz name from URL params
        if (params.quiz) {
            const quizNameInput = document.getElementById('quiz-name');
            if (quizNameInput) {
                quizNameInput.value = params.quiz;
            }
        }
        
        // Reset to join form if not in session
        if (!this.sessionId) {
            this.showJoinForm();
        }
    }

    setupEventListeners() {
        // Join form submission
        const joinForm = document.getElementById('join-form');
        joinForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinSession();
        });

        // Leave session button
        const leaveBtn = document.getElementById('leave-session-btn');
        leaveBtn?.addEventListener('click', () => {
            this.leaveSession();
        });

        // Answer selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.answer-option') && !this.isAnswered) {
                this.selectAnswer(e.target.closest('.answer-option'));
            }
        });

        // Results actions
        const playAgainBtn = document.getElementById('play-again-btn');
        playAgainBtn?.addEventListener('click', () => {
            this.playAgain();
        });

        const shareBtn = document.getElementById('share-results-btn');
        shareBtn?.addEventListener('click', () => {
            this.shareResults();
        });
    }

    setupRealtimeEvents() {
        // Session events
        this.realtime.on('session_started', (data) => this.handleSessionStarted(data));
        this.realtime.on('session_ended', (data) => this.handleSessionEnded(data));
        this.realtime.on('question_changed', (data) => this.handleQuestionChanged(data));
        this.realtime.on('timer_updated', (data) => this.handleTimerUpdate(data));
        this.realtime.on('timer_expired', (data) => this.handleTimeUp(data));
        this.realtime.on('participant_joined', (data) => this.handleParticipantUpdate(data));
        this.realtime.on('participant_left', (data) => this.handleParticipantUpdate(data));
        this.realtime.on('quiz_ended', (data) => this.handleQuizEnded(data));
    }

    async joinSession() {
        const name = document.getElementById('participant-name')?.value.trim();
        const quizName = document.getElementById('quiz-name')?.value.trim();

        if (!name || !quizName) {
            this.app.showNotification('Bitte füllen Sie alle Felder aus', 'error');
            return;
        }

        this.app.showLoading('Trete Quiz bei...');

        try {
            // Join quiz by name
            const sessionData = await this.cloudAPI.joinQuizByName(quizName, name);
            
            this.sessionId = sessionData.sessionId;
            this.participantId = sessionData.participantId;
            this.participantName = name;
            this.quiz = sessionData.quiz;
            
            // Connect to realtime
            await this.realtime.connect(this.sessionId, this.participantId);
            
            // Update UI
            this.showWaitingScreen();
            this.app.hideLoading();
            this.app.showNotification('Erfolgreich beigetreten!', 'success');
            
            // Update app state
            this.app.setSession({
                id: this.sessionId,
                participantId: this.participantId,
                quiz: this.quiz
            });
            
        } catch (error) {
            console.error('Join error:', error);
            this.app.hideLoading();
            this.app.showNotification(`Fehler beim Beitreten: ${error.message}`, 'error');
        }
    }

    async leaveSession() {
        if (!confirm('Möchten Sie die Session wirklich verlassen?')) {
            return;
        }

        try {
            if (this.sessionId) {
                await this.cloudAPI.leaveSession(this.sessionId, this.participantId);
                this.realtime.leaveSession(this.sessionId);
            }
            
            this.resetSession();
            this.showJoinForm();
            this.app.clearSession();
            this.app.showNotification('Session verlassen', 'info');
            
        } catch (error) {
            console.error('Leave error:', error);
            this.app.showNotification('Fehler beim Verlassen', 'error');
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
        document.getElementById('join-form')?.reset();
    }

    // Screen Management
    showJoinForm() {
        const joinSection = document.querySelector('.join-section');
        const quizSession = document.getElementById('quiz-session');
        
        if (joinSection) joinSection.style.display = 'block';
        if (quizSession) quizSession.style.display = 'none';
    }

    showWaitingScreen() {
        const joinSection = document.querySelector('.join-section');
        const quizSession = document.getElementById('quiz-session');
        const waitingScreen = document.getElementById('waiting-screen');
        
        if (joinSection) joinSection.style.display = 'none';
        if (quizSession) quizSession.style.display = 'block';
        if (waitingScreen) waitingScreen.style.display = 'block';
        
        // Update waiting screen content
        const quizTitle = document.getElementById('waiting-quiz-title');
        if (quizTitle && this.quiz) {
            quizTitle.textContent = this.quiz.title;
        }
    }

    showQuizScreen() {
        this.hideAllQuizScreens();
        const quizScreen = document.getElementById('quiz-screen');
        if (quizScreen) quizScreen.style.display = 'block';
    }

    showResultsScreen() {
        this.hideAllQuizScreens();
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen) resultsScreen.style.display = 'block';
    }

    hideAllQuizScreens() {
        const screens = ['waiting-screen', 'quiz-screen', 'results-screen'];
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) screen.style.display = 'none';
        });
    }

    // Event Handlers
    handleSessionStarted(data) {
        this.quiz = data.quiz;
        this.currentQuestionIndex = data.currentQuestion || 0;
        
        this.showQuizScreen();
        this.displayCurrentQuestion();
        this.app.showNotification('Quiz gestartet!', 'success');
    }

    handleSessionEnded(data) {
        this.stopTimer();
        this.showWaitingScreen();
        this.app.showNotification('Session beendet', 'info');
    }

    handleQuestionChanged(data) {
        this.currentQuestionIndex = data.questionIndex;
        this.isAnswered = false;
        this.selectedAnswer = null;
        this.displayCurrentQuestion();
    }

    handleTimerUpdate(data) {
        this.timeRemaining = data.timeRemaining;
        this.updateTimerDisplay();
    }

    handleTimeUp(data) {
        this.timeUp();
    }

    handleQuizEnded(data) {
        this.displayResults(data.finalLeaderboard || []);
    }

    handleParticipantUpdate(data) {
        const counter = document.getElementById('participant-counter');
        if (counter && data.participantCount !== undefined) {
            counter.textContent = data.participantCount;
        }
    }

    // Quiz Gameplay
    displayCurrentQuestion() {
        if (!this.quiz || !this.quiz.questions[this.currentQuestionIndex]) {
            return;
        }

        const question = this.quiz.questions[this.currentQuestionIndex];
        
        // Update question info
        const questionNumber = document.getElementById('question-number');
        const totalQuestions = document.getElementById('total-questions');
        const questionText = document.getElementById('question-text');
        const currentScore = document.getElementById('current-score');
        
        if (questionNumber) questionNumber.textContent = this.currentQuestionIndex + 1;
        if (totalQuestions) totalQuestions.textContent = this.quiz.questions.length;
        if (questionText) questionText.textContent = question.text;
        if (currentScore) currentScore.textContent = this.score;
        
        // Create answer options
        const optionsContainer = document.getElementById('answer-options');
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            
            question.answers.forEach((answer, index) => {
                const option = document.createElement('div');
                option.className = 'answer-option';
                option.dataset.index = index;
                option.innerHTML = `
                    <span class="answer-label">${String.fromCharCode(65 + index)}</span>
                    <span class="answer-text">${answer.text}</span>
                `;
                optionsContainer.appendChild(option);
            });
        }
        
        // Hide feedback and reset timer
        const feedback = document.getElementById('answer-feedback');
        if (feedback) feedback.style.display = 'none';
        
        this.timeRemaining = 30;
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
        
        // Calculate points
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
            
        } catch (error) {
            console.error('Submit answer error:', error);
        }
    }

    showAnswerFeedback(isCorrect, points) {
        const feedback = document.getElementById('answer-feedback');
        if (!feedback) return;
        
        if (isCorrect) {
            feedback.className = 'answer-feedback correct';
            feedback.innerHTML = `<i class="fas fa-check"></i> Richtig! +${points} Punkte`;
        } else {
            feedback.className = 'answer-feedback incorrect';
            feedback.innerHTML = `<i class="fas fa-times"></i> Falsch!`;
        }
        
        feedback.style.display = 'block';
        
        // Highlight correct answer
        const options = document.querySelectorAll('.answer-option');
        const question = this.quiz.questions[this.currentQuestionIndex];
        
        question.answers.forEach((answer, index) => {
            if (answer.correct) {
                options[index]?.classList.add('correct');
            } else if (index === this.selectedAnswer && !isCorrect) {
                options[index]?.classList.add('incorrect');
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
        this.showResultsScreen();
        
        // Show personal stats
        const finalScore = document.getElementById('final-score');
        const correctCount = document.getElementById('correct-answers');
        const incorrectCount = document.getElementById('incorrect-answers');
        const avgTime = document.getElementById('average-time');
        const finalRank = document.getElementById('final-rank');
        
        if (finalScore) finalScore.textContent = this.score;
        if (correctCount) correctCount.textContent = this.correctAnswers;
        if (incorrectCount) incorrectCount.textContent = this.incorrectAnswers;
        
        // Calculate rank
        const rank = leaderboard.findIndex(p => p.participantId === this.participantId) + 1;
        if (finalRank) finalRank.textContent = rank > 0 ? `#${rank}` : '-';
        
        // Calculate average time
        const averageTime = this.answerTimes.length > 0 
            ? (this.answerTimes.reduce((a, b) => a + b, 0) / this.answerTimes.length).toFixed(1)
            : '-';
        if (avgTime) avgTime.textContent = averageTime !== '-' ? `${averageTime}s` : '-';
        
        // Show leaderboard
        this.renderFinalLeaderboard(leaderboard);
        
        this.app.showNotification('Quiz beendet! Ergebnisse anzeigen', 'success');
    }

    renderFinalLeaderboard(leaderboard) {
        const container = document.getElementById('final-leaderboard');
        if (!container) return;
        
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
        this.showJoinForm();
        this.app.clearSession();
    }

    shareResults() {
        const text = `Ich habe ${this.score} Punkte im Quiz "${this.quiz?.title || 'PiGi Quiz'}" erreicht! 🎉`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Meine Quiz-Ergebnisse',
                text: text,
                url: window.location.origin
            }).catch(console.error);
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                this.app.showNotification('Ergebnis in Zwischenablage kopiert!', 'success');
            }).catch(() => {
                this.app.showNotification('Teilen nicht möglich', 'error');
            });
        }
    }
}
