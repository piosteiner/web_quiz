// Rate Limiter Middleware
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create different rate limiters for different endpoints
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
    }
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs for sensitive operations
    message: {
        error: 'Too many requests from this IP',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: {
        error: 'Too many authentication attempts',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Export the general limiter as default
module.exports = generalLimiter;

// Also export named exports for specific use cases
module.exports.general = generalLimiter;
module.exports.strict = strictLimiter;
module.exports.auth = authLimiter;
