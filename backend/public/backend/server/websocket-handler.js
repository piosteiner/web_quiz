// WebSocket Handler - Manages real-time communication for live quiz sessions
const logger = require('./utils/logger');

class WebSocketHandler {
    constructor(io, sessionManager, quizManager) {
        this.io = io;
        this.sessionManager = sessionManager;
        this.quizManager = quizManager;
        this.connectedUsers = new Map(); // socketId -> user info
        this.sessionRooms = new Map(); // sessionId -> Set of socketIds

        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`Socket connected: ${socket.id}`);

            // Join session as participant
            socket.on('join-session', async (data) => {
                try {
                    const { sessionId, participantName, participantId } = data;
                    
                    const session = this.sessionManager.getSession(sessionId);
                    if (!session) {
                        socket.emit('error', { message: 'Session not found' });
                        return;
                    }

                    // Add participant to session
                    const result = this.sessionManager.addParticipant(sessionId, {
                        id: participantId,
                        name: participantName,
                        socketId: socket.id
                    });

                    // Join socket room
                    socket.join(sessionId);
                    
                    // Track user and room
                    this.connectedUsers.set(socket.id, {
                        participantId: result.participant.id,
                        sessionId,
                        role: 'participant',
                        name: participantName
                    });

                    if (!this.sessionRooms.has(sessionId)) {
                        this.sessionRooms.set(sessionId, new Set());
                    }
                    this.sessionRooms.get(sessionId).add(socket.id);

                    // Send session data to participant
                    socket.emit('session-joined', {
                        session: this.sanitizeSessionForParticipant(session),
                        participant: result.participant
                    });

                    // Notify others in session
                    socket.to(sessionId).emit('participant-joined', {
                        participant: result.participant,
                        participantCount: session.participants.size
                    });

                    logger.info(`Participant joined session: ${participantName} -> ${sessionId}`);

                } catch (error) {
                    logger.error('Error joining session:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Join session as host/admin
            socket.on('join-session-host', async (data) => {
                try {
                    const { sessionId, hostToken } = data;
                    
                    const session = this.sessionManager.getSession(sessionId);
                    if (!session) {
                        socket.emit('error', { message: 'Session not found' });
                        return;
                    }

                    // TODO: Validate host token
                    
                    socket.join(sessionId);
                    socket.join(`${sessionId}-host`);

                    this.connectedUsers.set(socket.id, {
                        sessionId,
                        role: 'host',
                        hostToken
                    });

                    if (!this.sessionRooms.has(sessionId)) {
                        this.sessionRooms.set(sessionId, new Set());
                    }
                    this.sessionRooms.get(sessionId).add(socket.id);

                    // Send full session data to host
                    socket.emit('session-joined-host', {
                        session,
                        quiz: await this.quizManager.getQuizById(session.quizId),
                        stats: this.sessionManager.getSessionStats(sessionId)
                    });

                    logger.info(`Host joined session: ${sessionId}`);

                } catch (error) {
                    logger.error('Error joining session as host:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Start session (host only)
            socket.on('start-session', (data) => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (!user || user.role !== 'host') {
                        socket.emit('error', { message: 'Unauthorized' });
                        return;
                    }

                    const session = this.sessionManager.startSession(user.sessionId);
                    
                    // Notify all participants
                    this.io.to(user.sessionId).emit('session-started', {
                        session: this.sanitizeSessionForParticipant(session)
                    });

                    logger.info(`Session started: ${user.sessionId}`);

                } catch (error) {
                    logger.error('Error starting session:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Pause session (host only)
            socket.on('pause-session', () => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (!user || user.role !== 'host') {
                        socket.emit('error', { message: 'Unauthorized' });
                        return;
                    }

                    const session = this.sessionManager.pauseSession(user.sessionId);
                    
                    this.io.to(user.sessionId).emit('session-paused', {
                        session: this.sanitizeSessionForParticipant(session)
                    });

                } catch (error) {
                    logger.error('Error pausing session:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Resume session (host only)
            socket.on('resume-session', () => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (!user || user.role !== 'host') {
                        socket.emit('error', { message: 'Unauthorized' });
                        return;
                    }

                    const session = this.sessionManager.resumeSession(user.sessionId);
                    
                    this.io.to(user.sessionId).emit('session-resumed', {
                        session: this.sanitizeSessionForParticipant(session)
                    });

                } catch (error) {
                    logger.error('Error resuming session:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Change question (host only)
            socket.on('change-question', async (data) => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (!user || user.role !== 'host') {
                        socket.emit('error', { message: 'Unauthorized' });
                        return;
                    }

                    const { questionIndex } = data;
                    const session = this.sessionManager.changeQuestion(user.sessionId, questionIndex);
                    const quiz = await this.quizManager.getQuizById(session.quizId);
                    
                    // Send question to participants (without correct answers)
                    const question = quiz.questions[questionIndex];
                    if (question) {
                        const sanitizedQuestion = {
                            ...question,
                            correctAnswer: undefined, // Remove correct answer
                            explanation: undefined    // Remove explanation
                        };

                        this.io.to(user.sessionId).emit('question-changed', {
                            question: sanitizedQuestion,
                            questionIndex,
                            timeLimit: session.config.questionTimeLimit
                        });

                        // Send full question data to host
                        socket.emit('question-changed-host', {
                            question,
                            questionIndex,
                            session
                        });
                    }

                } catch (error) {
                    logger.error('Error changing question:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Submit answer (participant only)
            socket.on('submit-answer', async (data) => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (!user || user.role !== 'participant') {
                        socket.emit('error', { message: 'Unauthorized' });
                        return;
                    }

                    const { questionIndex, answer } = data;
                    
                    // Submit answer
                    const answerRecord = this.sessionManager.submitAnswer(
                        user.sessionId, 
                        user.participantId, 
                        { questionIndex, answer, timestamp: Date.now() }
                    );

                    // Get quiz to check correct answer
                    const session = this.sessionManager.getSession(user.sessionId);
                    const quiz = await this.quizManager.getQuizById(session.quizId);
                    const question = quiz.questions[questionIndex];
                    
                    if (question) {
                        const isCorrect = question.correctAnswer === answer;
                        
                        // Calculate score (with time bonus)
                        const responseTime = answerRecord.responseTime || 0;
                        const maxTime = session.config.questionTimeLimit * 1000;
                        const timeBonus = Math.max(0, Math.round((maxTime - responseTime) / 100)); // Bonus points for speed
                        
                        const points = question.points || 10;
                        const newScore = this.sessionManager.updateScore(
                            user.sessionId, 
                            user.participantId, 
                            questionIndex, 
                            isCorrect, 
                            points, 
                            timeBonus
                        );

                        // Send confirmation to participant
                        socket.emit('answer-submitted', {
                            questionIndex,
                            isCorrect,
                            score: newScore,
                            responseTime
                        });

                        // Update leaderboard for host
                        const leaderboard = this.sessionManager.getLeaderboard(user.sessionId);
                        this.io.to(`${user.sessionId}-host`).emit('leaderboard-updated', {
                            leaderboard,
                            answerSubmission: {
                                participantId: user.participantId,
                                participantName: user.name,
                                questionIndex,
                                isCorrect,
                                score: newScore
                            }
                        });
                    }

                } catch (error) {
                    logger.error('Error submitting answer:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Get leaderboard
            socket.on('get-leaderboard', () => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (!user) {
                        socket.emit('error', { message: 'Not in session' });
                        return;
                    }

                    const session = this.sessionManager.getSession(user.sessionId);
                    if (session && session.config.showLeaderboard) {
                        const leaderboard = this.sessionManager.getLeaderboard(user.sessionId);
                        socket.emit('leaderboard', { leaderboard });
                    }

                } catch (error) {
                    logger.error('Error getting leaderboard:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // End session (host only)
            socket.on('end-session', () => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (!user || user.role !== 'host') {
                        socket.emit('error', { message: 'Unauthorized' });
                        return;
                    }

                    const session = this.sessionManager.endSession(user.sessionId);
                    const leaderboard = this.sessionManager.getLeaderboard(user.sessionId, 20);
                    
                    this.io.to(user.sessionId).emit('session-ended', {
                        session: this.sanitizeSessionForParticipant(session),
                        finalLeaderboard: leaderboard
                    });

                } catch (error) {
                    logger.error('Error ending session:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (user) {
                        logger.info(`Socket disconnected: ${socket.id} (${user.role})`);

                        if (user.role === 'participant' && user.participantId) {
                            // Update participant connection status
                            this.sessionManager.updateParticipantConnection(
                                user.participantId, 
                                false
                            );

                            // Notify session about disconnection
                            socket.to(user.sessionId).emit('participant-disconnected', {
                                participantId: user.participantId,
                                participantName: user.name
                            });
                        }

                        // Remove from tracking
                        this.connectedUsers.delete(socket.id);
                        
                        const sessionSockets = this.sessionRooms.get(user.sessionId);
                        if (sessionSockets) {
                            sessionSockets.delete(socket.id);
                            if (sessionSockets.size === 0) {
                                this.sessionRooms.delete(user.sessionId);
                            }
                        }
                    }
                } catch (error) {
                    logger.error('Error handling disconnect:', error);
                }
            });

            // Ping/pong for connection health
            socket.on('ping', () => {
                socket.emit('pong');
            });
        });
    }

    // Remove sensitive data from session for participants
    sanitizeSessionForParticipant(session) {
        return {
            id: session.id,
            quizId: session.quizId,
            status: session.status,
            currentQuestion: session.currentQuestion,
            participantCount: session.participants.size,
            config: {
                questionTimeLimit: session.config.questionTimeLimit,
                showCorrectAnswers: session.config.showCorrectAnswers,
                showLeaderboard: session.config.showLeaderboard
            }
        };
    }

    // Broadcast message to session
    broadcastToSession(sessionId, event, data) {
        this.io.to(sessionId).emit(event, data);
    }

    // Broadcast message to session hosts
    broadcastToHosts(sessionId, event, data) {
        this.io.to(`${sessionId}-host`).emit(event, data);
    }

    // Get session connection stats
    getSessionConnectionStats(sessionId) {
        const sessionSockets = this.sessionRooms.get(sessionId);
        const connectedCount = sessionSockets ? sessionSockets.size : 0;
        
        const participants = Array.from(this.connectedUsers.values())
            .filter(user => user.sessionId === sessionId && user.role === 'participant');
        
        const hosts = Array.from(this.connectedUsers.values())
            .filter(user => user.sessionId === sessionId && user.role === 'host');

        return {
            totalConnections: connectedCount,
            participants: participants.length,
            hosts: hosts.length
        };
    }
}

module.exports = WebSocketHandler;
