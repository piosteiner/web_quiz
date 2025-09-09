/**
 * Participant Component
 * Handles the complete participant quiz experience including answering questions and leaderboard
 */

export class Participant {
    constructor(app) {
        this.app = app;
        this.cloudAPI = app.getCloudAPI();
        this.realtime = app.realtime;
        
        this.currentQuiz = null;
        this.participant = null;
        this.currentQuestion = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.timeRemaining = 0;
        this.questionTimer = null;
        this.quizStarted = false;
        this.quizCompleted = false;
        this.score = 0;
        this.leaderboard = [];
        this.websocketConnected = false;
    }

    async init(params = {}) {
        console.log('👥 Initializing Participant Interface');
        
        this.currentQuiz = params.quiz;
        this.participant = params.participant;
        
        if (!this.currentQuiz || !this.participant) {
            this.showError('Ungültige Quiz- oder Teilnehmerdaten');
            return;
        }

        // Setup real-time connection
        await this.setupRealtimeConnection();
        
        // Show initial waiting state
        this.showWaitingRoom();
        
        this.setupEventListeners();
    }

    async setupRealtimeConnection() {
        try {
            // Connect to quiz session via WebSocket
            await this.realtime.connect();
            
            // Join quiz room
            this.realtime.emit('join-quiz', {
                quizId: this.currentQuiz.id,
                participantId: this.participant.participantId,
                participantName: this.participant.participantName
            });

            // Listen for quiz events
            this.realtime.on('quiz-started', (data) => {
                console.log('Quiz started:', data);
                this.handleQuizStart(data);
            });

            this.realtime.on('question-started', (data) => {
                console.log('Question started:', data);
                this.handleQuestionStart(data);
            });

            this.realtime.on('question-ended', (data) => {
                console.log('Question ended:', data);
                this.handleQuestionEnd(data);
            });

            this.realtime.on('quiz-ended', (data) => {
                console.log('Quiz ended:', data);
                this.handleQuizEnd(data);
            });

            this.realtime.on('leaderboard-updated', (data) => {
                console.log('Leaderboard updated:', data);
                this.updateLeaderboard(data.leaderboard);
            });

            this.realtime.on('participant-joined', (data) => {
                console.log('Participant joined:', data);
                this.updateParticipantCount(data.count);
            });

            this.websocketConnected = true;
            this.app.showNotification('Verbindung hergestellt', 'success');
            
        } catch (error) {
            console.error('Failed to setup realtime connection:', error);
            this.app.showNotification('Verbindung fehlgeschlagen - Offline-Modus', 'warning');
        }
    }

    setupEventListeners() {
        // Answer selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-option')) {
                this.selectAnswer(e.target);
            }
        });

        // Submit answer button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'submit-answer') {
                this.submitAnswer();
            }
        });

        // Leave quiz button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'leave-quiz') {
                this.leaveQuiz();
            }
        });

        // Refresh/reconnect button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'reconnect-btn') {
                this.reconnect();
            }
        });
    }

    showWaitingRoom() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="participant-container">
                <div class="participant-header">
                    <div class="quiz-info">
                        <h1><i class="fas fa-gamepad"></i> ${this.currentQuiz.title}</h1>
                        <p>${this.currentQuiz.description || ''}</p>
                    </div>
                    <div class="participant-badge">
                        <span class="participant-name">${this.participant.participantName}</span>
                        <span class="quiz-id">Quiz: ${this.currentQuiz.id}</span>
                    </div>
                </div>

                <div class="waiting-room">
                    <div class="waiting-content">
                        <div class="waiting-icon">
                            <i class="fas fa-clock fa-3x"></i>
                        </div>
                        <h2>Warten auf Quiz-Start</h2>
                        <p>Sie sind erfolgreich dem Quiz beigetreten. Der Quiz-Administrator wird das Quiz in Kürze starten.</p>
                        
                        <div class="quiz-stats">
                            <div class="stat-item">
                                <i class="fas fa-question-circle"></i>
                                <span>${this.currentQuiz.questions?.length || 0} Fragen</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-clock"></i>
                                <span>${this.currentQuiz.settings?.timePerQuestion || 30}s pro Frage</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-users"></i>
                                <span id="participant-count">${this.currentQuiz.participants?.length || 0} Teilnehmer</span>
                            </div>
                        </div>

                        <div class="connection-status ${this.websocketConnected ? 'connected' : 'disconnected'}">
                            <i class="fas fa-wifi"></i>
                            <span id="connection-text">
                                ${this.websocketConnected ? 'Verbunden' : 'Verbindung wird hergestellt...'}
                            </span>
                        </div>
                    </div>

                    <div class="waiting-actions">
                        <button id="reconnect-btn" class="btn btn-secondary">
                            <i class="fas fa-sync"></i> Aktualisieren
                        </button>
                        <button id="leave-quiz" class="btn btn-danger">
                            <i class="fas fa-sign-out-alt"></i> Quiz verlassen
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    handleQuizStart(data) {
        this.quizStarted = true;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.score = 0;
        
        this.app.showNotification('Quiz gestartet!', 'success');
        
        // Auto-start first question or wait for question-started event
        if (data.firstQuestion) {
            this.handleQuestionStart({
                question: data.firstQuestion,
                questionIndex: 0,
                timeLimit: data.timeLimit || this.currentQuiz.settings?.timePerQuestion || 30
            });
        }
    }

    handleQuestionStart(data) {
        this.currentQuestion = data.question;
        this.currentQuestionIndex = data.questionIndex;
        this.timeRemaining = data.timeLimit;
        
        this.showQuestion();
        this.startQuestionTimer();
    }

    showQuestion() {
        const container = document.getElementById('app');
        const question = this.currentQuestion;
        const questionNumber = this.currentQuestionIndex + 1;
        const totalQuestions = this.currentQuiz.questions?.length || 0;
        
        container.innerHTML = `
            <div class="participant-container">
                <div class="question-header">
                    <div class="question-progress">
                        <div class="progress-info">
                            <span class="question-number">Frage ${questionNumber} von ${totalQuestions}</span>
                            <span class="participant-name">${this.participant.participantName}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(questionNumber / totalQuestions) * 100}%"></div>
                        </div>
                    </div>
                    
                    <div class="timer-container">
                        <div class="timer ${this.timeRemaining <= 10 ? 'warning' : ''}">
                            <i class="fas fa-clock"></i>
                            <span id="timer-display">${this.timeRemaining}</span>
                        </div>
                    </div>
                </div>

                <div class="question-content">
                    <div class="question-card">
                        <h2 class="question-text">${question.text}</h2>
                        
                        <div class="answers-container">
                            ${question.answers.map((answer, index) => `
                                <button class="answer-option" data-answer-id="${answer.id}" data-answer-index="${index}">
                                    <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
                                    <span class="answer-text">${answer.text}</span>
                                </button>
                            `).join('')}
                        </div>

                        <div class="question-actions">
                            <button id="submit-answer" class="btn btn-primary btn-large" disabled>
                                <i class="fas fa-check"></i> Antwort bestätigen
                            </button>
                        </div>
                    </div>
                </div>

                <div class="current-score">
                    <i class="fas fa-star"></i>
                    <span>Aktuelle Punkte: ${this.score}</span>
                </div>
            </div>
        `;
    }

    startQuestionTimer() {
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
        }

        this.questionTimer = setInterval(() => {
            this.timeRemaining--;
            
            const timerDisplay = document.getElementById('timer-display');
            const timerContainer = document.querySelector('.timer');
            
            if (timerDisplay) {
                timerDisplay.textContent = this.timeRemaining;
            }
            
            if (timerContainer) {
                if (this.timeRemaining <= 10) {
                    timerContainer.classList.add('warning');
                }
                if (this.timeRemaining <= 5) {
                    timerContainer.classList.add('critical');
                }
            }

            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    selectAnswer(answerElement) {
        // Remove previous selection
        document.querySelectorAll('.answer-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Select current answer
        answerElement.classList.add('selected');
        
        // Enable submit button
        const submitBtn = document.getElementById('submit-answer');
        if (submitBtn) {
            submitBtn.disabled = false;
        }

        // Store selected answer
        this.selectedAnswer = {
            id: answerElement.dataset.answerId,
            index: parseInt(answerElement.dataset.answerIndex),
            text: answerElement.querySelector('.answer-text').textContent
        };
    }

    submitAnswer() {
        if (!this.selectedAnswer) {
            this.app.showNotification('Bitte wählen Sie eine Antwort', 'warning');
            return;
        }

        this.stopQuestionTimer();
        
        // Calculate points (more points for faster answers)
        const maxTime = this.currentQuiz.settings?.timePerQuestion || 30;
        const timeBonus = Math.max(0, this.timeRemaining / maxTime);
        const basePoints = this.currentQuestion.points || 100;
        const earnedPoints = Math.round(basePoints * (0.5 + 0.5 * timeBonus));

        // Store answer
        const answer = {
            questionId: this.currentQuestion.id,
            questionIndex: this.currentQuestionIndex,
            selectedAnswer: this.selectedAnswer,
            timeUsed: maxTime - this.timeRemaining,
            earnedPoints: earnedPoints,
            timestamp: new Date().toISOString()
        };

        this.answers.push(answer);

        // Send answer to server
        if (this.websocketConnected) {
            this.realtime.emit('submit-answer', {
                quizId: this.currentQuiz.id,
                participantId: this.participant.participantId,
                answer: answer
            });
        }

        // Show answer feedback
        this.showAnswerFeedback(answer);
    }

    showAnswerFeedback(answer) {
        const correctAnswer = this.currentQuestion.answers.find(a => a.correct);
        const isCorrect = answer.selectedAnswer.id === correctAnswer?.id;
        
        if (isCorrect) {
            this.score += answer.earnedPoints;
        }

        // Highlight correct/incorrect answers
        document.querySelectorAll('.answer-option').forEach(option => {
            const answerId = option.dataset.answerId;
            
            if (answerId === correctAnswer?.id) {
                option.classList.add('correct');
            } else if (answerId === answer.selectedAnswer.id && !isCorrect) {
                option.classList.add('incorrect');
            }
            
            option.disabled = true;
        });

        // Update submit button
        const submitBtn = document.getElementById('submit-answer');
        if (submitBtn) {
            submitBtn.innerHTML = isCorrect 
                ? '<i class="fas fa-check"></i> Richtig! +' + answer.earnedPoints + ' Punkte'
                : '<i class="fas fa-times"></i> Falsch';
            submitBtn.className = `btn btn-large ${isCorrect ? 'btn-success' : 'btn-danger'}`;
            submitBtn.disabled = true;
        }

        // Show points earned
        this.app.showNotification(
            isCorrect 
                ? `Richtig! +${answer.earnedPoints} Punkte` 
                : 'Falsch - Keine Punkte', 
            isCorrect ? 'success' : 'error'
        );
    }

    timeUp() {
        this.stopQuestionTimer();
        
        // Auto-submit with no answer
        const answer = {
            questionId: this.currentQuestion.id,
            questionIndex: this.currentQuestionIndex,
            selectedAnswer: null,
            timeUsed: this.currentQuiz.settings?.timePerQuestion || 30,
            earnedPoints: 0,
            timestamp: new Date().toISOString()
        };

        this.answers.push(answer);

        if (this.websocketConnected) {
            this.realtime.emit('submit-answer', {
                quizId: this.currentQuiz.id,
                participantId: this.participant.participantId,
                answer: answer
            });
        }

        this.app.showNotification('Zeit abgelaufen!', 'warning');
        
        // Show correct answer
        const correctAnswer = this.currentQuestion.answers.find(a => a.correct);
        if (correctAnswer) {
            document.querySelectorAll('.answer-option').forEach(option => {
                if (option.dataset.answerId === correctAnswer.id) {
                    option.classList.add('correct');
                }
                option.disabled = true;
            });
        }

        const submitBtn = document.getElementById('submit-answer');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-clock"></i> Zeit abgelaufen';
            submitBtn.className = 'btn btn-large btn-warning';
            submitBtn.disabled = true;
        }
    }

    stopQuestionTimer() {
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }
    }

    handleQuestionEnd(data) {
        // Question ended, wait for next question or quiz end
        setTimeout(() => {
            if (data.nextQuestion) {
                this.handleQuestionStart({
                    question: data.nextQuestion,
                    questionIndex: data.questionIndex + 1,
                    timeLimit: data.timeLimit || this.currentQuiz.settings?.timePerQuestion || 30
                });
            } else {
                this.showIntermediateResults();
            }
        }, 3000); // Show results for 3 seconds
    }

    showIntermediateResults() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="participant-container">
                <div class="results-header">
                    <h2><i class="fas fa-chart-bar"></i> Zwischenergebnis</h2>
                    <div class="participant-score">
                        <span class="score-label">Ihre Punkte:</span>
                        <span class="score-value">${this.score}</span>
                    </div>
                </div>

                <div class="intermediate-content">
                    <div class="waiting-next">
                        <i class="fas fa-hourglass-half fa-2x"></i>
                        <p>Warten auf nächste Frage...</p>
                    </div>

                    <div id="leaderboard-container" class="leaderboard-container">
                        ${this.renderLeaderboard()}
                    </div>
                </div>
            </div>
        `;
    }

    handleQuizEnd(data) {
        this.quizCompleted = true;
        this.stopQuestionTimer();
        
        if (data.finalLeaderboard) {
            this.leaderboard = data.finalLeaderboard;
        }

        this.showFinalResults();
    }

    showFinalResults() {
        const container = document.getElementById('app');
        const myRank = this.leaderboard.findIndex(p => p.participantId === this.participant.participantId) + 1;
        const totalParticipants = this.leaderboard.length;
        
        container.innerHTML = `
            <div class="participant-container">
                <div class="final-results">
                    <div class="results-header">
                        <h1><i class="fas fa-trophy"></i> Quiz beendet!</h1>
                        <div class="final-score">
                            <div class="score-circle">
                                <span class="score-number">${this.score}</span>
                                <span class="score-label">Punkte</span>
                            </div>
                            <div class="rank-info">
                                <span class="rank">Platz ${myRank} von ${totalParticipants}</span>
                            </div>
                        </div>
                    </div>

                    <div class="quiz-summary">
                        <h3>Quiz-Zusammenfassung</h3>
                        <div class="summary-stats">
                            <div class="stat">
                                <i class="fas fa-question-circle"></i>
                                <span>${this.answers.length} von ${this.currentQuiz.questions?.length || 0} Fragen beantwortet</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-check"></i>
                                <span>${this.getCorrectAnswersCount()} richtige Antworten</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-clock"></i>
                                <span>Durchschnittliche Zeit: ${this.getAverageTime()}s</span>
                            </div>
                        </div>
                    </div>

                    <div class="final-leaderboard">
                        <h3><i class="fas fa-crown"></i> Endstand</h3>
                        ${this.renderLeaderboard(true)}
                    </div>

                    <div class="final-actions">
                        <button onclick="window.location.reload()" class="btn btn-primary">
                            <i class="fas fa-redo"></i> Neues Quiz
                        </button>
                        <button id="leave-quiz" class="btn btn-secondary">
                            <i class="fas fa-home"></i> Zur Startseite
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderLeaderboard(final = false) {
        if (!this.leaderboard || this.leaderboard.length === 0) {
            return '<div class="empty-leaderboard">Bestenliste wird geladen...</div>';
        }

        return `
            <div class="leaderboard ${final ? 'final' : ''}">
                ${this.leaderboard.map((participant, index) => `
                    <div class="leaderboard-item ${participant.participantId === this.participant.participantId ? 'current-user' : ''}">
                        <div class="rank">
                            ${index + 1}
                            ${index === 0 ? '<i class="fas fa-crown"></i>' : ''}
                        </div>
                        <div class="participant-info">
                            <span class="name">${participant.name}</span>
                            <span class="details">${participant.correctAnswers || 0} richtig</span>
                        </div>
                        <div class="score">${participant.score || 0}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateLeaderboard(newLeaderboard) {
        this.leaderboard = newLeaderboard;
        
        const leaderboardContainer = document.getElementById('leaderboard-container');
        if (leaderboardContainer) {
            leaderboardContainer.innerHTML = this.renderLeaderboard();
        }
    }

    updateParticipantCount(count) {
        const participantCount = document.getElementById('participant-count');
        if (participantCount) {
            participantCount.textContent = `${count} Teilnehmer`;
        }
    }

    getCorrectAnswersCount() {
        return this.answers.filter(answer => {
            if (!answer.selectedAnswer) return false;
            const question = this.currentQuiz.questions.find(q => q.id === answer.questionId);
            const correctAnswer = question?.answers.find(a => a.correct);
            return answer.selectedAnswer.id === correctAnswer?.id;
        }).length;
    }

    getAverageTime() {
        if (this.answers.length === 0) return 0;
        const totalTime = this.answers.reduce((sum, answer) => sum + (answer.timeUsed || 0), 0);
        return Math.round(totalTime / this.answers.length);
    }

    reconnect() {
        this.app.showLoading('Verbindung wird wiederhergestellt...');
        
        setTimeout(() => {
            this.setupRealtimeConnection().then(() => {
                this.app.hideLoading();
                this.app.showNotification('Verbindung wiederhergestellt', 'success');
            }).catch(() => {
                this.app.hideLoading();
                this.app.showNotification('Verbindung fehlgeschlagen', 'error');
            });
        }, 1000);
    }

    leaveQuiz() {
        if (confirm('Möchten Sie das Quiz wirklich verlassen?')) {
            // Disconnect from realtime
            if (this.websocketConnected) {
                this.realtime.emit('leave-quiz', {
                    quizId: this.currentQuiz.id,
                    participantId: this.participant.participantId
                });
                this.realtime.disconnect();
            }

            // Clear timers
            this.stopQuestionTimer();

            // Clear state
            this.app.setState({ participantSession: null, currentQuiz: null });
            
            // Clear URL parameters
            const newUrl = new URL(window.location);
            newUrl.search = '';
            window.history.pushState({}, '', newUrl);
            
            // Return to home or join form
            window.location.reload();
        }
    }

    showError(message) {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="participant-container">
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <h2>Fehler</h2>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Erneut versuchen
                    </button>
                </div>
            </div>
        `;
    }
}
