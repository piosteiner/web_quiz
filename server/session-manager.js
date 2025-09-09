// Session Manager - Handles live quiz sessions and participant management
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');

class SessionManager {
    constructor() {
        // In-memory storage for sessions
        this.sessions = new Map();
        this.participants = new Map(); // participantId -> session info
        this.scores = new Map(); // sessionId -> Map(participantId -> score)
    }

    // Create live session
    createSession(quizId, config = {}) {
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            quizId,
            status: 'waiting', // waiting, active, paused, ended
            config: {
                maxParticipants: config.maxParticipants || 50,
                questionTimeLimit: config.questionTimeLimit || 30,
                showCorrectAnswers: config.showCorrectAnswers !== false,
                allowLateJoin: config.allowLateJoin !== false,
                shuffleQuestions: config.shuffleQuestions || false,
                shuffleAnswers: config.shuffleAnswers || true,
                autoAdvance: config.autoAdvance !== false,
                showLeaderboard: config.showLeaderboard !== false,
                ...config
            },
            participants: new Map(),
            currentQuestion: 0,
            currentQuestionStartTime: null,
            timer: null,
            hostId: config.hostId || null,
            createdAt: new Date().toISOString(),
            startedAt: null,
            endedAt: null
        };

        this.sessions.set(sessionId, session);
        this.scores.set(sessionId, new Map());

        logger.info(`Session created: ${sessionId} for quiz: ${quizId}`);
        return session;
    }

    // Get session by ID
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    // Start session
    startSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.status === 'active') {
            throw new Error('Session is already active');
        }

        session.status = 'active';
        session.startedAt = new Date().toISOString();
        session.currentQuestion = 0;
        session.currentQuestionStartTime = Date.now();

        logger.info(`Session started: ${sessionId}`);
        return session;
    }

    // Pause session
    pauseSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.status = 'paused';
        logger.info(`Session paused: ${sessionId}`);
        return session;
    }

    // Resume session
    resumeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.status !== 'paused') {
            throw new Error('Session is not paused');
        }

        session.status = 'active';
        logger.info(`Session resumed: ${sessionId}`);
        return session;
    }

    // End session
    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.status = 'ended';
        session.endedAt = new Date().toISOString();

        logger.info(`Session ended: ${sessionId}`);
        return session;
    }

    // Add participant to session
    addParticipant(sessionId, participantData) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.participants.size >= session.config.maxParticipants) {
            throw new Error('Session is full');
        }

        if (!session.config.allowLateJoin && session.status === 'active') {
            throw new Error('Late joining is not allowed');
        }

        const participantId = participantData.id || uuidv4();
        const participant = {
            id: participantId,
            name: participantData.name,
            joinedAt: new Date().toISOString(),
            socketId: participantData.socketId || null,
            connected: true,
            score: 0,
            answers: new Map() // questionIndex -> answer data
        };

        session.participants.set(participantId, participant);
        this.participants.set(participantId, {
            sessionId,
            participantId,
            joinedAt: participant.joinedAt
        });

        // Initialize score
        const sessionScores = this.scores.get(sessionId);
        sessionScores.set(participantId, 0);

        logger.info(`Participant joined: ${participantId} (${participant.name}) -> Session: ${sessionId}`);
        return { participant, session };
    }

    // Remove participant from session
    removeParticipant(sessionId, participantId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const participant = session.participants.get(participantId);
        if (!participant) {
            throw new Error('Participant not found');
        }

        session.participants.delete(participantId);
        this.participants.delete(participantId);

        // Remove scores
        const sessionScores = this.scores.get(sessionId);
        sessionScores.delete(participantId);

        logger.info(`Participant removed: ${participantId} (${participant.name}) from Session: ${sessionId}`);
        return participant;
    }

    // Update participant connection status
    updateParticipantConnection(participantId, connected, socketId = null) {
        const participantInfo = this.participants.get(participantId);
        if (!participantInfo) {
            return null;
        }

        const session = this.sessions.get(participantInfo.sessionId);
        if (!session) {
            return null;
        }

        const participant = session.participants.get(participantId);
        if (!participant) {
            return null;
        }

        participant.connected = connected;
        if (socketId) {
            participant.socketId = socketId;
        }

        return participant;
    }

    // Submit answer
    submitAnswer(sessionId, participantId, answerData) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const participant = session.participants.get(participantId);
        if (!participant) {
            throw new Error('Participant not found');
        }

        if (session.status !== 'active') {
            throw new Error('Session is not active');
        }

        const { questionIndex, answer, timestamp } = answerData;

        // Check if already answered this question
        if (participant.answers.has(questionIndex)) {
            throw new Error('Already answered this question');
        }

        // Store answer
        const answerRecord = {
            questionIndex,
            answer,
            timestamp: timestamp || Date.now(),
            responseTime: timestamp ? timestamp - session.currentQuestionStartTime : null
        };

        participant.answers.set(questionIndex, answerRecord);

        logger.info(`Answer submitted: Participant ${participantId}, Question ${questionIndex}, Session ${sessionId}`);
        return answerRecord;
    }

    // Calculate and update score
    updateScore(sessionId, participantId, questionIndex, isCorrect, points, timeBonus = 0) {
        const sessionScores = this.scores.get(sessionId);
        if (!sessionScores) {
            throw new Error('Session not found');
        }

        const currentScore = sessionScores.get(participantId) || 0;
        const newScore = currentScore + (isCorrect ? points + timeBonus : 0);

        sessionScores.set(participantId, newScore);

        // Update participant score
        const session = this.sessions.get(sessionId);
        if (session) {
            const participant = session.participants.get(participantId);
            if (participant) {
                participant.score = newScore;
            }
        }

        logger.info(`Score updated: Participant ${participantId}, Score: ${newScore}, Session: ${sessionId}`);
        return newScore;
    }

    // Get leaderboard
    getLeaderboard(sessionId, limit = 10) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const leaderboard = Array.from(session.participants.values())
            .map(participant => ({
                participantId: participant.id,
                name: participant.name,
                score: participant.score,
                connected: participant.connected,
                answeredQuestions: participant.answers.size
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return leaderboard;
    }

    // Change current question
    changeQuestion(sessionId, questionIndex) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.currentQuestion = questionIndex;
        session.currentQuestionStartTime = Date.now();

        logger.info(`Question changed: Session ${sessionId}, Question ${questionIndex}`);
        return session;
    }

    // Get session statistics
    getSessionStats(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const participantCount = session.participants.size;
        const connectedCount = Array.from(session.participants.values())
            .filter(p => p.connected).length;

        const scores = Array.from(session.participants.values()).map(p => p.score);
        const averageScore = scores.length > 0 
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
            : 0;

        return {
            sessionId,
            status: session.status,
            participantCount,
            connectedCount,
            currentQuestion: session.currentQuestion,
            averageScore: Math.round(averageScore),
            duration: session.startedAt ? 
                Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000) : 0,
            createdAt: session.createdAt,
            startedAt: session.startedAt,
            endedAt: session.endedAt
        };
    }

    // Get all active sessions
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter(session => 
            session.status === 'active' || session.status === 'waiting'
        );
    }

    // Cleanup ended sessions (call periodically)
    cleanupSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.sessions.entries()) {
            const sessionAge = now - new Date(session.createdAt).getTime();
            
            if (session.status === 'ended' && sessionAge > maxAge) {
                // Remove session and related data
                this.sessions.delete(sessionId);
                this.scores.delete(sessionId);

                // Remove participants
                for (const participantId of session.participants.keys()) {
                    this.participants.delete(participantId);
                }

                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.info(`Cleaned up ${cleanedCount} old sessions`);
        }

        return cleanedCount;
    }
}

module.exports = SessionManager;
