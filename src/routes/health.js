// Health Check API Route
const express = require('express');
const router = express.Router();
const os = require('os');
const logger = require('../utils/logger');

// Health check endpoint
router.get('/', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: new Date().toISOString(),
        service: 'QuizMaster API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            system: Math.round(os.totalmem() / 1024 / 1024)
        },
        cpu: {
            usage: process.cpuUsage(),
            loadAverage: os.loadavg()
        },
        platform: {
            arch: os.arch(),
            platform: os.platform(),
            release: os.release(),
            hostname: os.hostname()
        }
    };

    try {
        res.status(200).json({
            success: true,
            data: healthcheck
        });
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(503).json({
            success: false,
            message: 'Service Unavailable',
            error: error.message
        });
    }
});

// Detailed health check
router.get('/detailed', (req, res) => {
    try {
        const detailed = {
            timestamp: new Date().toISOString(),
            service: {
                name: 'QuizMaster',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                uptime: process.uptime(),
                pid: process.pid
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                hostname: os.hostname(),
                cpus: os.cpus().length,
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem()
                },
                loadAverage: os.loadavg()
            },
            process: {
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                versions: process.versions
            },
            features: {
                realTimeQuizzes: true,
                liveScoreboard: true,
                timerSynchronization: true,
                participantManagement: true,
                webSocketSupport: true
            }
        };

        res.status(200).json({
            success: true,
            data: detailed
        });
    } catch (error) {
        logger.error('Detailed health check error:', error);
        res.status(503).json({
            success: false,
            message: 'Service Unavailable',
            error: error.message
        });
    }
});

// Liveness probe
router.get('/live', (req, res) => {
    res.status(200).json({ status: 'alive' });
});

// Readiness probe
router.get('/ready', (req, res) => {
    // Check if all services are ready
    // For now, just return ready
    res.status(200).json({ status: 'ready' });
});

module.exports = router;
