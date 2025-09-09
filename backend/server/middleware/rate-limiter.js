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
    // Skip failed requests - don't count them against the limit
    skipFailedRequests: true,
    // Skip successful requests for certain status codes
    skipSuccessfulRequests: false,
    // Custom key generator that's more resilient
    keyGenerator: (req) => {
        // Try to get real IP, fallback to connection IP
        const forwardedIps = req.get('X-Forwarded-For');
        const realIp = req.get('X-Real-IP');
        const cfConnectingIp = req.get('CF-Connecting-IP');
        
        // Priority: CF-Connecting-IP > X-Real-IP > first X-Forwarded-For > req.ip
        if (cfConnectingIp) return cfConnectingIp;
        if (realIp) return realIp;
        if (forwardedIps) return forwardedIps.split(',')[0].trim();
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    // Error handler to prevent crashes
    onLimitReached: (req, res, options) => {
        const clientIp = req.ip || 'unknown';
        logger.warn(`Rate limit exceeded for IP: ${clientIp}, User-Agent: ${req.get('User-Agent')}`);
    },
    handler: (req, res) => {
        const clientIp = req.ip || 'unknown';
        logger.warn(`Rate limit handler triggered for IP: ${clientIp}`);
        res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
    },
    // Disable strict mode to prevent errors with proxy headers
    validate: {
        trustProxy: false, // Let Express handle trust proxy
        xForwardedForHeader: false, // Disable validation that causes crashes
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
    legacyHeaders: false,
    skipFailedRequests: true,
    keyGenerator: (req) => {
        const forwardedIps = req.get('X-Forwarded-For');
        const realIp = req.get('X-Real-IP');
        const cfConnectingIp = req.get('CF-Connecting-IP');
        
        if (cfConnectingIp) return cfConnectingIp;
        if (realIp) return realIp;
        if (forwardedIps) return forwardedIps.split(',')[0].trim();
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    validate: {
        trustProxy: false,
        xForwardedForHeader: false,
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: {
        error: 'Too many authentication attempts',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false, // Count failed auth attempts
    keyGenerator: (req) => {
        const forwardedIps = req.get('X-Forwarded-For');
        const realIp = req.get('X-Real-IP');
        const cfConnectingIp = req.get('CF-Connecting-IP');
        
        if (cfConnectingIp) return cfConnectingIp;
        if (realIp) return realIp;
        if (forwardedIps) return forwardedIps.split(',')[0].trim();
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    validate: {
        trustProxy: false,
        xForwardedForHeader: false,
    }
});

// Export the general limiter as default
module.exports = generalLimiter;

// Also export named exports for specific use cases
module.exports.general = generalLimiter;
module.exports.strict = strictLimiter;
module.exports.auth = authLimiter;
