// QuizMaster Server - Main Application
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import custom modules
const QuizManager = require('./quiz-manager');
const SessionManager = require('./session-manager');
const WebSocketHandler = require('./websocket-handler');
const logger = require('./utils/logger');
const rateLimiter = require('./middleware/rate-limiter');
const errorHandler = require('./middleware/error-handler');

class QuizMasterServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || [
                    "http://localhost:3000", 
                    "http://localhost:8080",
                    "https://quiz.piogino.ch",
                    "https://quiz-backend.piogino.ch"
                ],
                methods: ["GET", "POST", "PUT", "DELETE"],
                credentials: true
            }
        });
        
        this.port = process.env.PORT || 3000;
        
        // Initialize managers
        this.quizManager = new QuizManager();
        this.sessionManager = new SessionManager();
        this.websocketHandler = new WebSocketHandler(this.io, this.sessionManager, this.quizManager);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false, // Disable for development
            crossOriginEmbedderPolicy: false
        }));
        
        // CORS
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || [
                "http://localhost:3000", 
                "http://localhost:8080",
                "https://quiz.piogino.ch",
                "https://quiz-backend.piogino.ch"
            ],
            credentials: true
        }));
        
        // Compression
        this.app.use(compression());
        
        // Logging
        this.app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Rate limiting
        this.app.use('/api/', rateLimiter);
        
        // Static files - serve from project root
        const staticPath = path.join(__dirname, '../../');  // Up two levels to project root
        
        this.app.use(express.static(staticPath, {
            maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
            etag: true,
            lastModified: true
        }));
    }

    setupRoutes() {
        // Import route creators
        const createQuizRoutes = require('./routes/quizzes');
        const createSessionRoutes = require('./routes/sessions');
        const createParticipantRoutes = require('./routes/participants');
        const healthRoutes = require('./routes/health');
        
        // API Routes
        this.app.use('/api/quizzes', createQuizRoutes(this.quizManager));
        this.app.use('/api/sessions', createSessionRoutes(this.sessionManager, this.quizManager));
        this.app.use('/api/participants', createParticipantRoutes(this.sessionManager));
        this.app.use('/api/health', healthRoutes);
        
        // Serve main application
        this.app.get('/', (req, res) => {
            const indexPath = process.env.NODE_ENV === 'production' 
                ? path.join(__dirname, '../../index.html')  // Root level of project
                : path.join(__dirname, '../../index.html');  // Same for development
            res.sendFile(indexPath);
        });

        // Explicitly serve admin pages
        this.app.get('/html/admin.html', (req, res) => {
            const adminPath = path.join(__dirname, '../../html/admin.html');
            res.sendFile(adminPath);
        });

        this.app.get('/html/join.html', (req, res) => {
            const joinPath = path.join(__dirname, '../../html/join.html');
            res.sendFile(joinPath);
        });

        this.app.get('/html/live-control.html', (req, res) => {
            const livePath = path.join(__dirname, '../../html/live-control.html');
            res.sendFile(livePath);
        });

        // SPA fallback - serve index.html for any non-API routes
        this.app.get('*', (req, res, next) => {
            // Don't interfere with API routes or Socket.IO
            if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
                return next();
            }
            
            // Don't interfere with direct HTML file requests
            if (req.path.endsWith('.html')) {
                return next();
            }
            
            // Don't interfere with static files (css, js, images, etc.)
            if (req.path.includes('.') && !req.path.endsWith('/')) {
                return next();
            }
            
            const indexPath = process.env.NODE_ENV === 'production' 
                ? path.join(__dirname, '../../app.html')
                : path.join(__dirname, '../../app.html');
            res.sendFile(indexPath);
        });
        
        // Serve admin panel (redirect to SPA)
        this.app.get('/admin', (req, res) => {
            res.redirect('/#admin');
        });
        
        // Serve join page (redirect to SPA)
        this.app.get('/join', (req, res) => {
            res.redirect('/#join');
        });
        
        // Serve live control (redirect to SPA)
        this.app.get('/live', (req, res) => {
            res.redirect('/#live');
        });
        
        // API documentation
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'QuizMaster API',
                version: '1.0.0',
                description: 'Real-time quiz platform API',
                endpoints: {
                    quizzes: '/api/quizzes',
                    sessions: '/api/sessions',
                    participants: '/api/participants',
                    websocket: '/socket.io',
                    health: '/api/health'
                },
                documentation: '/docs'
            });
        });
        
        // 404 handler for API routes
        this.app.use('/api/*', (req, res) => {
            res.status(404).json({
                error: 'API endpoint not found',
                message: `The endpoint ${req.path} does not exist`,
                availableEndpoints: ['/api/quizzes', '/api/sessions', '/api/participants', '/api/health']
            });
        });
        
        // Catch-all handler for SPA routing
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../index.html'));
        });
    }

    setupWebSocket() {
        // WebSocket handler is already initialized in constructor
        // Just log WebSocket connections
        this.io.on('connection', (socket) => {
            logger.info(`WebSocket client connected: ${socket.id}`);
            
            socket.on('disconnect', (reason) => {
                logger.info(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
            });
        });
    }

    setupErrorHandling() {
        // Global error handler
        this.app.use(errorHandler);
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error('Unhandled Promise Rejection:', err);
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception:', err);
            process.exit(1);
        });
    }

    start() {
        this.server.listen(this.port, () => {
            logger.info(`🚀 QuizMaster Server running on port ${this.port}`);
            logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🌐 Server URL: http://localhost:${this.port}`);
            logger.info(`🔗 API Base: http://localhost:${this.port}/api`);
            logger.info(`⚡ WebSocket: ws://localhost:${this.port}/socket.io`);
            
            // Log active features
            logger.info('✅ Features enabled:');
            logger.info('   - Real-time quiz sessions');
            logger.info('   - Live scoreboard updates');
            logger.info('   - Timer synchronization');
            logger.info('   - Participant management');
            logger.info('   - Quiz creation and editing');
        });
        
        this.server.on('error', (error) => {
            logger.error('Server error:', error);
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${this.port} is already in use`);
            }
        });
        
        return this.server;
    }

    stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                logger.info('🛑 QuizMaster Server stopped');
                resolve();
            });
        });
    }

    // Graceful shutdown
    setupGracefulShutdown() {
        const gracefulShutdown = (signal) => {
            logger.info(`📴 ${signal} received, starting graceful shutdown...`);
            
            // Close server
            this.server.close(() => {
                logger.info('✅ HTTP server closed');
                
                // Close WebSocket connections
                this.io.close(() => {
                    logger.info('✅ WebSocket server closed');
                    process.exit(0);
                });
            });
            
            // Force exit after 10 seconds
            setTimeout(() => {
                logger.error('❌ Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    }
}

// Create and start server
const server = new QuizMasterServer();
server.setupGracefulShutdown();

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    server.start();
}

module.exports = server;
