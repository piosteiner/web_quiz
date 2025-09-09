// Session API Routes
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

function createSessionRoutes(sessionManager, quizManager) {
    // Create new session
    router.post('/', async (req, res) => {
        try {
            const { quizId, config } = req.body;
            
            if (!quizId) {
                return res.status(400).json({
                    success: false,
                    error: 'Quiz ID is required'
                });
            }

            // Verify quiz exists
            const quiz = await quizManager.getQuizById(quizId);
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found'
                });
            }

            if (!quiz.status || quiz.status !== 'published') {
                return res.status(400).json({
                    success: false,
                    error: 'Quiz is not published'
                });
            }

            const session = sessionManager.createSession(quizId, config);
            
            res.status(201).json({
                success: true,
                data: {
                    session,
                    quiz: {
                        id: quiz.id,
                        title: quiz.title,
                        description: quiz.description,
                        questionCount: quiz.questions.length,
                        estimatedTime: quiz.estimatedTime
                    }
                }
            });
        } catch (error) {
            logger.error('Error creating session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create session'
            });
        }
    });

    // Get session by ID
    router.get('/:id', (req, res) => {
        try {
            const session = sessionManager.getSession(req.params.id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            res.json({
                success: true,
                data: session
            });
        } catch (error) {
            logger.error('Error getting session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve session'
            });
        }
    });

    // Get session info for participants (limited data)
    router.get('/:id/info', async (req, res) => {
        try {
            const session = sessionManager.getSession(req.params.id);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
            }

            const quiz = await quizManager.getQuizById(session.quizId);
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found'
                });
            }

            // Limited session info for participants
            const sessionInfo = {
                id: session.id,
                status: session.status,
                participantCount: session.participants.size,
                maxParticipants: session.config.maxParticipants,
                allowLateJoin: session.config.allowLateJoin,
                quiz: {
                    id: quiz.id,
                    title: quiz.title,
                    description: quiz.description,
                    category: quiz.category,
                    difficulty: quiz.difficulty,
                    questionCount: quiz.questions.length,
                    estimatedTime: quiz.estimatedTime
                }
            };

            res.json({
                success: true,
                data: sessionInfo
            });
        } catch (error) {
            logger.error('Error getting session info:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve session info'
            });
        }
    });

    // Start session
    router.post('/:id/start', (req, res) => {
        try {
            const session = sessionManager.startSession(req.params.id);
            res.json({
                success: true,
                data: session,
                message: 'Session started successfully'
            });
        } catch (error) {
            logger.error('Error starting session:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // Pause session
    router.post('/:id/pause', (req, res) => {
        try {
            const session = sessionManager.pauseSession(req.params.id);
            res.json({
                success: true,
                data: session,
                message: 'Session paused successfully'
            });
        } catch (error) {
            logger.error('Error pausing session:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // Resume session
    router.post('/:id/resume', (req, res) => {
        try {
            const session = sessionManager.resumeSession(req.params.id);
            res.json({
                success: true,
                data: session,
                message: 'Session resumed successfully'
            });
        } catch (error) {
            logger.error('Error resuming session:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // End session
    router.post('/:id/end', (req, res) => {
        try {
            const session = sessionManager.endSession(req.params.id);
            const leaderboard = sessionManager.getLeaderboard(req.params.id, 20);
            
            res.json({
                success: true,
                data: {
                    session,
                    finalLeaderboard: leaderboard
                },
                message: 'Session ended successfully'
            });
        } catch (error) {
            logger.error('Error ending session:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // Get session leaderboard
    router.get('/:id/leaderboard', (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const leaderboard = sessionManager.getLeaderboard(req.params.id, parseInt(limit));
            
            res.json({
                success: true,
                data: leaderboard
            });
        } catch (error) {
            logger.error('Error getting leaderboard:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // Get session statistics
    router.get('/:id/stats', (req, res) => {
        try {
            const stats = sessionManager.getSessionStats(req.params.id);
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error getting session stats:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // Change current question
    router.post('/:id/question', (req, res) => {
        try {
            const { questionIndex } = req.body;
            
            if (typeof questionIndex !== 'number' || questionIndex < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid question index is required'
                });
            }

            const session = sessionManager.changeQuestion(req.params.id, questionIndex);
            
            res.json({
                success: true,
                data: session,
                message: `Question changed to ${questionIndex}`
            });
        } catch (error) {
            logger.error('Error changing question:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // Join session (for participants)
    router.post('/:id/join', (req, res) => {
        try {
            const { participantName, participantId } = req.body;
            
            if (!participantName) {
                return res.status(400).json({
                    success: false,
                    error: 'Participant name is required'
                });
            }

            const result = sessionManager.addParticipant(req.params.id, {
                id: participantId,
                name: participantName
            });

            res.json({
                success: true,
                data: {
                    participant: result.participant,
                    session: {
                        id: result.session.id,
                        status: result.session.status,
                        participantCount: result.session.participants.size
                    }
                },
                message: 'Joined session successfully'
            });
        } catch (error) {
            logger.error('Error joining session:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // Leave session (for participants)
    router.delete('/:id/participants/:participantId', (req, res) => {
        try {
            const participant = sessionManager.removeParticipant(
                req.params.id, 
                req.params.participantId
            );

            res.json({
                success: true,
                data: participant,
                message: 'Left session successfully'
            });
        } catch (error) {
            logger.error('Error leaving session:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    // Get all active sessions
    router.get('/', (req, res) => {
        try {
            const sessions = sessionManager.getActiveSessions();
            
            // Return limited info for each session
            const sessionsInfo = sessions.map(session => ({
                id: session.id,
                quizId: session.quizId,
                status: session.status,
                participantCount: session.participants.size,
                maxParticipants: session.config.maxParticipants,
                createdAt: session.createdAt,
                startedAt: session.startedAt
            }));

            res.json({
                success: true,
                data: sessionsInfo
            });
        } catch (error) {
            logger.error('Error getting active sessions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve sessions'
            });
        }
    });

    return router;
}

module.exports = createSessionRoutes;
