// Authentication Routes
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

function createAuthRoutes() {
    // Mock authentication for development
    // In production, replace with real authentication system
    
    // Login route
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            
            // Mock validation - replace with real authentication
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
            }
            
            // Mock user authentication
            if (email === 'admin@quiz.com' && password === 'admin123') {
                const mockUser = {
                    id: 'admin-user',
                    name: 'Quiz Administrator',
                    email: email,
                    role: 'admin'
                };
                
                const mockToken = 'mock-jwt-token-' + Date.now();
                
                res.json({
                    success: true,
                    token: mockToken,
                    user: mockUser
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
        } catch (error) {
            logger.error('Error during login:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed'
            });
        }
    });
    
    // Register route  
    router.post('/register', async (req, res) => {
        try {
            const { name, email, password } = req.body;
            
            // Mock validation
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, email and password are required'
                });
            }
            
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 6 characters'
                });
            }
            
            // Mock registration success
            const newUser = {
                id: 'user-' + Date.now(),
                name: name,
                email: email,
                role: 'user'
            };
            
            res.status(201).json({
                success: true,
                user: newUser,
                message: 'Registration successful'
            });
        } catch (error) {
            logger.error('Error during registration:', error);
            res.status(500).json({
                success: false,
                error: 'Registration failed'
            });
        }
    });
    
    // Get current user profile
    router.get('/me', async (req, res) => {
        try {
            // Mock authentication check - replace with real JWT validation
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'No token provided'
                });
            }
            
            // Mock user data - replace with real user lookup
            const mockUser = {
                id: 'admin-user',
                name: 'Quiz Administrator', 
                email: 'admin@quiz.com',
                role: 'admin'
            };
            
            res.json({
                success: true,
                user: mockUser
            });
        } catch (error) {
            logger.error('Error getting user profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user profile'
            });
        }
    });
    
    // Logout route
    router.post('/logout', async (req, res) => {
        try {
            // In a real implementation, you would invalidate the token
            // For mock implementation, just return success
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            logger.error('Error during logout:', error);
            res.status(500).json({
                success: false,
                error: 'Logout failed'
            });
        }
    });
    
    return router;
}

module.exports = createAuthRoutes;
