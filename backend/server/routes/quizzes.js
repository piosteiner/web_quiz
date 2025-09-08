// Quiz API Routes
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

function createQuizRoutes(quizManager) {
    // Get all quizzes
    router.get('/', async (req, res) => {
        try {
            const { published } = req.query;
            const quizzes = await quizManager.getAllQuizzes(published === 'true');
            res.json({
                success: true,
                data: quizzes
            });
        } catch (error) {
            logger.error('Error getting quizzes:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve quizzes'
            });
        }
    });

    // Get quiz by ID
    router.get('/:id', async (req, res) => {
        try {
            const quiz = await quizManager.getQuizById(req.params.id);
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found'
                });
            }

            res.json({
                success: true,
                data: quiz
            });
        } catch (error) {
            logger.error('Error getting quiz:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve quiz'
            });
        }
    });

    // Create new quiz
    router.post('/', async (req, res) => {
        try {
            const quizData = req.body;
            const quiz = await quizManager.createQuiz(quizData);
            
            res.status(201).json({
                success: true,
                data: quiz
            });
        } catch (error) {
            logger.error('Error creating quiz:', error);
            
            if (error.message.includes('validation')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to create quiz'
            });
        }
    });

    // Update quiz
    router.put('/:id', async (req, res) => {
        try {
            const quiz = await quizManager.updateQuiz(req.params.id, req.body);
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found'
                });
            }

            res.json({
                success: true,
                data: quiz
            });
        } catch (error) {
            logger.error('Error updating quiz:', error);
            
            if (error.message.includes('validation')) {
                return res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to update quiz'
            });
        }
    });

    // Delete quiz
    router.delete('/:id', async (req, res) => {
        try {
            const success = await quizManager.deleteQuiz(req.params.id);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found'
                });
            }

            res.json({
                success: true,
                message: 'Quiz deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting quiz:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete quiz'
            });
        }
    });

    // Publish/unpublish quiz
    router.patch('/:id/publish', async (req, res) => {
        try {
            const { published } = req.body;
            const quiz = await quizManager.publishQuiz(req.params.id, published !== false);
            
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found'
                });
            }

            res.json({
                success: true,
                data: quiz,
                message: `Quiz ${published !== false ? 'published' : 'unpublished'} successfully`
            });
        } catch (error) {
            logger.error('Error publishing quiz:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update quiz publish status'
            });
        }
    });

    // Get quiz preview (sanitized for participants)
    router.get('/:id/preview', async (req, res) => {
        try {
            const quiz = await quizManager.getQuizById(req.params.id);
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found'
                });
            }

            // Remove sensitive data for preview
            const preview = {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                category: quiz.category,
                difficulty: quiz.difficulty,
                estimatedTime: quiz.estimatedTime,
                questionCount: quiz.questions.length,
                published: quiz.published
            };

            res.json({
                success: true,
                data: preview
            });
        } catch (error) {
            logger.error('Error getting quiz preview:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve quiz preview'
            });
        }
    });

    return router;
}

module.exports = createQuizRoutes;
