// Live Quiz Session Manager
import CloudAPIService from './cloud-api.js';
import realTimeService from './realtime.js';
import CONFIG from './config.js';

class LiveQuizManager {
    constructor() {
        this.api = new CloudAPIService();
        this.realtime = realTimeService;  // Use the singleton instance
        this.currentSession = null;
        this.currentQuiz = null;
        this.participants = new Map();
        this.scores = new Map();
        this.currentQuestion = 0;
        this.timer = null;
        this.isHost = false;
        this.sessionConfig = null;
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Real-time event handlers
        this.realtime.on('quiz_session_started', (data) => this.handleSessionStarted(data));
        this.realtime.on('question_changed', (data) => this.handleQuestionChanged(data));
        this.realtime.on('timer_update', (data) => this.handleTimerUpdate(data));
        this.realtime.on('timer_ended', (data) => this.handleTimerEnded(data));
        this.realtime.on('participant_joined', (data) => this.handleParticipantJoined(data));
        this.realtime.on('participant_left', (data) => this.handleParticipantLeft(data));
        this.realtime.on('score_updated', (data) => this.handleScoreUpdate(data));
        this.realtime.on('leaderboard_updated', (data) => this.handleLeaderboardUpdate(data));
        this.realtime.on('connection_failed', () => this.handleConnectionFailed());
    }

    // Session Creation and Management
    async createLiveSession(quizId, config = {}) {
        try {
            const defaultConfig = {
                maxParticipants: 50,
                questionTimeLimit: 30, // seconds
                showCorrectAnswers: true,
                allowLateJoin: true,
                shuffleQuestions: false,
                shuffleAnswers: true,
                autoAdvance: true,
                showLeaderboard: true
            };

            this.sessionConfig = { ...defaultConfig, ...config };
            
            // Create session on server
            const session = await this.api.createLiveSession(quizId, this.sessionConfig);
            this.currentSession = session;
            this.isHost = true;
            
            // Connect to WebSocket
            await this.realtime.connect(session.id, session.hostId);
            
            console.log('Live-Session erstellt:', session.id);
            this.emitSessionEvent('session_created', { session, config: this.sessionConfig });
            
            return session;
        } catch (error) {
            throw new Error(`Live-Session konnte nicht erstellt werden: ${error.message}`);
        }
    }

    async joinSession(sessionId, participantName) {
        try {
            const participantId = this.generateParticipantId();
            
            // Connect to WebSocket first
            await this.realtime.connect(sessionId, participantId);
            
            // Register participant with server
            const participant = {
                id: participantId,
                name: participantName,
                joinedAt: new Date().toISOString(),
                score: 0
            };
            
            this.participants.set(participantId, participant);
            this.isHost = false;
            
            console.log('Session beigetreten:', sessionId);
            this.emitSessionEvent('session_joined', { sessionId, participant });
            
            return { sessionId, participantId };
        } catch (error) {
            throw new Error(`Session konnte nicht beigetreten werden: ${error.message}`);
        }
    }

    async startSession() {
        if (!this.isHost || !this.currentSession) {
            throw new Error('Nur der Host kann die Session starten');
        }

        try {
            // Get quiz data
            this.currentQuiz = await this.api.getQuizById(this.currentSession.quizId);
            
            if (!this.currentQuiz || !this.currentQuiz.questions.length) {
                throw new Error('Quiz hat keine Fragen');
            }

            // Shuffle questions if configured
            if (this.sessionConfig.shuffleQuestions) {
                this.currentQuiz.questions = this.shuffleArray([...this.currentQuiz.questions]);
            }

            // Start session on server
            await this.api.startSession(this.currentSession.id);
            
            // Notify all participants
            this.realtime.startQuizSession(this.currentSession.id, {
                quiz: this.currentQuiz,
                config: this.sessionConfig,
                startTime: Date.now()
            });

            // Start with first question
            this.currentQuestion = 0;
            this.showQuestion(0);
            
            console.log('Live-Session gestartet');
            this.emitSessionEvent('session_started', { quiz: this.currentQuiz });
            
        } catch (error) {
            throw new Error(`Session konnte nicht gestartet werden: ${error.message}`);
        }
    }

    async endSession() {
        if (!this.isHost || !this.currentSession) {
            throw new Error('Nur der Host kann die Session beenden');
        }

        try {
            // Calculate final results
            const results = this.calculateFinalResults();
            
            // End session on server
            await this.api.endSession(this.currentSession.id);
            
            // Notify all participants
            this.realtime.endQuizSession(this.currentSession.id, results);
            
            console.log('Live-Session beendet');
            this.emitSessionEvent('session_ended', { results });
            
            return results;
        } catch (error) {
            throw new Error(`Session konnte nicht beendet werden: ${error.message}`);
        }
    }

    // Question Management
    showQuestion(questionIndex) {
        if (!this.currentQuiz || questionIndex >= this.currentQuiz.questions.length) {
            this.endSession();
            return;
        }

        const question = this.currentQuiz.questions[questionIndex];
        this.currentQuestion = questionIndex;

        // Shuffle answers if configured
        if (this.sessionConfig.shuffleAnswers && question.type === 'multiple-choice') {
            question.answers = this.shuffleArray([...question.answers]);
        }

        // Broadcast question to all participants
        this.realtime.changeQuestion(this.currentSession.id, {
            question,
            questionNumber: questionIndex + 1,
            totalQuestions: this.currentQuiz.questions.length,
            timeLimit: this.sessionConfig.questionTimeLimit
        });

        // Start question timer
        this.startQuestionTimer();
        
        this.emitSessionEvent('question_shown', { question, questionIndex });
    }

    nextQuestion() {
        if (!this.isHost) return;
        
        this.stopQuestionTimer();
        
        if (this.currentQuestion < this.currentQuiz.questions.length - 1) {
            this.showQuestion(this.currentQuestion + 1);
        } else {
            this.endSession();
        }
    }

    // Timer Management
    startQuestionTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        let timeRemaining = this.sessionConfig.questionTimeLimit;
        
        this.timer = setInterval(() => {
            timeRemaining--;
            
            // Broadcast timer update
            this.realtime.updateTimer(this.currentSession.id, {
                remaining: timeRemaining,
                total: this.sessionConfig.questionTimeLimit
            });

            if (timeRemaining <= 0) {
                this.stopQuestionTimer();
                
                // Auto-advance to next question if configured
                if (this.sessionConfig.autoAdvance) {
                    setTimeout(() => this.nextQuestion(), 2000);
                }
            }
        }, 1000);
    }

    stopQuestionTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // Answer Submission
    submitAnswer(answerData) {
        if (!this.currentSession) {
            throw new Error('Keine aktive Session');
        }

        const submission = {
            questionIndex: this.currentQuestion,
            answer: answerData,
            timestamp: Date.now(),
            participantId: this.realtime.participantId
        };

        // Submit to server via WebSocket
        this.realtime.submitAnswer(this.currentSession.id, submission);
        
        this.emitSessionEvent('answer_submitted', submission);
    }

    // Scoring System
    calculateScore(submission, question) {
        const { answer, timestamp } = submission;
        const questionStartTime = question.startTime || Date.now() - this.sessionConfig.questionTimeLimit * 1000;
        const responseTime = timestamp - questionStartTime;
        
        // Check if answer is correct
        let isCorrect = false;
        let basePoints = question.points || 1;
        
        switch (question.type) {
            case 'multiple-choice':
                const correctAnswer = question.answers.find(a => a.correct);
                isCorrect = answer === correctAnswer?.text;
                break;
            case 'true-false':
                const correctTF = question.answers.find(a => a.correct);
                isCorrect = answer === correctTF?.text;
                break;
            case 'short-answer':
                const correctShort = question.answers[0]?.text.toLowerCase();
                isCorrect = answer.toLowerCase().trim() === correctShort;
                break;
        }

        if (!isCorrect) return 0;

        // Time bonus (faster answers get more points)
        const timeBonus = Math.max(0, 1 - (responseTime / (this.sessionConfig.questionTimeLimit * 1000)));
        const finalScore = Math.round(basePoints * (1 + timeBonus));
        
        return finalScore;
    }

    updateParticipantScore(participantId, additionalScore) {
        const currentScore = this.scores.get(participantId) || 0;
        const newScore = currentScore + additionalScore;
        this.scores.set(participantId, newScore);
        
        // Broadcast score update
        this.realtime.updateScore(this.currentSession.id, {
            participantId,
            score: newScore,
            lastQuestionScore: additionalScore
        });
    }

    // Leaderboard
    getLeaderboard() {
        const leaderboard = Array.from(this.scores.entries())
            .map(([participantId, score]) => ({
                participantId,
                participant: this.participants.get(participantId),
                score
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Top 10

        return leaderboard;
    }

    broadcastLeaderboard() {
        if (!this.isHost) return;
        
        const leaderboard = this.getLeaderboard();
        this.realtime.send(CONFIG.WS_EVENTS.LEADERBOARD_UPDATE, {
            sessionId: this.currentSession.id,
            leaderboard,
            timestamp: Date.now()
        });
    }

    // Event Handlers
    handleSessionStarted(data) {
        this.currentQuiz = data.quiz;
        this.sessionConfig = data.config;
        this.emitSessionEvent('session_started_received', data);
    }

    handleQuestionChanged(data) {
        this.currentQuestion = data.questionNumber - 1;
        data.question.startTime = Date.now();
        this.emitSessionEvent('question_changed_received', data);
    }

    handleTimerUpdate(data) {
        this.emitSessionEvent('timer_update_received', data);
    }

    handleTimerEnded(data) {
        this.emitSessionEvent('timer_ended_received', data);
    }

    handleParticipantJoined(data) {
        this.participants.set(data.participantId, data.participant);
        this.emitSessionEvent('participant_joined_received', data);
    }

    handleParticipantLeft(data) {
        this.participants.delete(data.participantId);
        this.scores.delete(data.participantId);
        this.emitSessionEvent('participant_left_received', data);
    }

    handleScoreUpdate(data) {
        this.scores.set(data.participantId, data.score);
        this.emitSessionEvent('score_update_received', data);
    }

    handleLeaderboardUpdate(data) {
        this.emitSessionEvent('leaderboard_update_received', data);
    }

    handleConnectionFailed() {
        this.emitSessionEvent('connection_failed', {
            message: 'Verbindung zur Live-Session verloren'
        });
    }

    // Utility Methods
    generateParticipantId() {
        return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    calculateFinalResults() {
        const leaderboard = this.getLeaderboard();
        const totalParticipants = this.participants.size;
        const totalQuestions = this.currentQuiz?.questions.length || 0;
        
        return {
            sessionId: this.currentSession.id,
            leaderboard,
            totalParticipants,
            totalQuestions,
            endTime: new Date().toISOString(),
            quiz: this.currentQuiz
        };
    }

    // Event System
    emitSessionEvent(eventType, data) {
        window.dispatchEvent(new CustomEvent(`live_quiz_${eventType}`, {
            detail: data
        }));
    }

    // Status and Info
    getSessionInfo() {
        return {
            session: this.currentSession,
            quiz: this.currentQuiz,
            currentQuestion: this.currentQuestion,
            participants: Array.from(this.participants.values()),
            scores: Object.fromEntries(this.scores),
            isHost: this.isHost,
            config: this.sessionConfig,
            connectionStatus: this.realtime.getConnectionStatus()
        };
    }

    isSessionActive() {
        return this.currentSession && this.realtime.isSessionActive();
    }

    // Cleanup
    disconnect() {
        this.stopQuestionTimer();
        this.realtime.disconnect();
        this.currentSession = null;
        this.currentQuiz = null;
        this.participants.clear();
        this.scores.clear();
        this.isHost = false;
    }

    destroy() {
        this.disconnect();
        this.realtime.destroy();
    }
}

export default LiveQuizManager;
