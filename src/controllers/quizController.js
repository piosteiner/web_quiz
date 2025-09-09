// Quiz Manager - Handles quiz CRUD operations and business logic
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class QuizController {
    constructor() {
        // In-memory storage for demo (replace with database in production)
        this.quizzes = new Map();
        this.initializeSampleQuizzes();
    }

    initializeSampleQuizzes() {
        // Create a sample quiz for demonstration
        const sampleQuiz = {
            id: 'sample-quiz-1',
            title: 'Deutschland Quiz',
            quizName: 'deutschland-quiz',
            description: 'Ein Quiz über deutsche Geographie und Kultur',
            category: 'Geographie',
            difficulty: 'medium',
            timeLimit: 30,
            shuffleQuestions: false,
            allowOpenRegistration: true,
            status: 'published',
            questions: [
                {
                    id: 'q1',
                    text: 'Was ist die Hauptstadt von Deutschland?',
                    type: 'multiple-choice',
                    points: 100,
                    answers: [
                        { text: 'München', correct: false },
                        { text: 'Berlin', correct: true },
                        { text: 'Hamburg', correct: false },
                        { text: 'Köln', correct: false }
                    ]
                },
                {
                    id: 'q2',
                    text: 'Welcher Fluss fließt durch Deutschland?',
                    type: 'multiple-choice',
                    points: 100,
                    answers: [
                        { text: 'Thames', correct: false },
                        { text: 'Seine', correct: false },
                        { text: 'Rhein', correct: true },
                        { text: 'Donau', correct: false }
                    ]
                },
                {
                    id: 'q3',
                    text: 'Deutschland hat 16 Bundesländer.',
                    type: 'true-false',
                    points: 50,
                    answers: [
                        { text: 'True', correct: true },
                        { text: 'False', correct: false }
                    ]
                }
            ],
            participants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            participantCount: 0,
            averageScore: 0
        };

        this.quizzes.set(sampleQuiz.id, sampleQuiz);
        logger.info('Sample quiz initialized');
    }

    // Get all quizzes
    getAllQuizzes() {
        return Array.from(this.quizzes.values());
    }

    // Get quiz by ID
    getQuizById(id) {
        return this.quizzes.get(id);
    }

    // Get quiz by name
    getQuizByName(quizName) {
        return Array.from(this.quizzes.values()).find(quiz => quiz.quizName === quizName);
    }

    // Create new quiz
    createQuiz(quizData) {
        const quiz = {
            id: uuidv4(),
            ...quizData,
            questions: quizData.questions || [],
            participants: quizData.participants || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            participantCount: 0,
            averageScore: 0
        };

        this.quizzes.set(quiz.id, quiz);
        logger.info(`Quiz created: ${quiz.id} - ${quiz.title}`);
        return quiz;
    }

    // Update quiz
    updateQuiz(id, updateData) {
        const quiz = this.quizzes.get(id);
        if (!quiz) {
            throw new Error('Quiz not found');
        }

        const updatedQuiz = {
            ...quiz,
            ...updateData,
            id, // Ensure ID doesn't change
            updatedAt: new Date().toISOString()
        };

        this.quizzes.set(id, updatedQuiz);
        logger.info(`Quiz updated: ${id} - ${updatedQuiz.title}`);
        return updatedQuiz;
    }

    // Delete quiz
    deleteQuiz(id) {
        const quiz = this.quizzes.get(id);
        if (!quiz) {
            throw new Error('Quiz not found');
        }

        this.quizzes.delete(id);
        logger.info(`Quiz deleted: ${id} - ${quiz.title}`);
        return { message: 'Quiz deleted successfully' };
    }

    // Publish quiz
    publishQuiz(id) {
        const quiz = this.quizzes.get(id);
        if (!quiz) {
            throw new Error('Quiz not found');
        }

        if (!quiz.questions || quiz.questions.length === 0) {
            throw new Error('Cannot publish quiz without questions');
        }

        quiz.status = 'published';
        quiz.updatedAt = new Date().toISOString();

        this.quizzes.set(id, quiz);
        logger.info(`Quiz published: ${id} - ${quiz.title}`);
        return quiz;
    }

    // Get quiz statistics
    getQuizStats(id) {
        const quiz = this.quizzes.get(id);
        if (!quiz) {
            throw new Error('Quiz not found');
        }

        return {
            id: quiz.id,
            title: quiz.title,
            participantCount: quiz.participantCount,
            averageScore: quiz.averageScore,
            questionCount: quiz.questions.length,
            createdAt: quiz.createdAt,
            lastPlayed: quiz.lastPlayed || null,
            totalSessions: quiz.totalSessions || 0
        };
    }

    // Validate quiz data
    validateQuizData(quizData) {
        const errors = [];

        if (!quizData.title || quizData.title.trim().length === 0) {
            errors.push('Quiz title is required');
        }

        if (!quizData.quizName || quizData.quizName.trim().length === 0) {
            errors.push('Quiz name is required');
        }

        if (quizData.questions) {
            quizData.questions.forEach((question, index) => {
                if (!question.text || question.text.trim().length === 0) {
                    errors.push(`Question ${index + 1}: Question text is required`);
                }

                if (!question.answers || question.answers.length === 0) {
                    errors.push(`Question ${index + 1}: At least one answer is required`);
                }

                if (question.type === 'multiple-choice' && (!question.answers || question.answers.length < 2)) {
                    errors.push(`Question ${index + 1}: Multiple choice questions need at least 2 answers`);
                }

                const correctAnswers = question.answers?.filter(answer => answer.correct);
                if (!correctAnswers || correctAnswers.length === 0) {
                    errors.push(`Question ${index + 1}: At least one correct answer is required`);
                }
            });
        }

        return errors;
    }

    // Search quizzes
    searchQuizzes(searchTerm, filters = {}) {
        let quizzes = Array.from(this.quizzes.values());

        // Text search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            quizzes = quizzes.filter(quiz =>
                quiz.title.toLowerCase().includes(term) ||
                quiz.description.toLowerCase().includes(term) ||
                quiz.category.toLowerCase().includes(term)
            );
        }

        // Category filter
        if (filters.category) {
            quizzes = quizzes.filter(quiz => quiz.category === filters.category);
        }

        // Status filter
        if (filters.status) {
            quizzes = quizzes.filter(quiz => quiz.status === filters.status);
        }

        // Difficulty filter
        if (filters.difficulty) {
            quizzes = quizzes.filter(quiz => quiz.difficulty === filters.difficulty);
        }

        return quizzes;
    }
}

module.exports = QuizController;
