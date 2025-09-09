/**
 * Unified Quiz Platform API Service
 * Single source of truth for all backend communication
 */

import CONFIG from './config.js';

// Custom Error Classes
class APIError extends Error {
    constructor(message, endpoint, originalError) {
        super(message);
        this.name = 'APIError';
        this.endpoint = endpoint;
        this.originalError = originalError;
    }
}

class ValidationError extends APIError {
    constructor(message, validationData) {
        super(message);
        this.name = 'ValidationError';
        this.validationData = validationData;
    }
}

class ServerError extends APIError {
    constructor(message, serverData) {
        super(message);
        this.name = 'ServerError';
        this.serverData = serverData;
    }
}

/**
 * Main API Service Class
 * Handles all backend communication with proper error handling and retry logic
 */
class APIService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL || 'http://quiz.piogino.ch/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        // Authentication state
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authToken = localStorage.getItem('quiz-auth-token');
        
        if (this.authToken) {
            this.defaultHeaders.Authorization = `Bearer ${this.authToken}`;
        }
    }

    /**
     * Core HTTP request method with retry logic
     */
    async makeRequest(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`🌐 API Request (attempt ${attempt}): ${config.method || 'GET'} ${url}`);
                
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    await this.handleErrorResponse(response, attempt, endpoint);
                    continue;
                }

                const data = await this.parseResponse(response);
                console.log(`✅ API Success: ${endpoint}`);
                
                // Handle backend response format {success, data, ...} vs direct data
                if (data && typeof data === 'object' && data.hasOwnProperty('success')) {
                    if (data.success) {
                        // Return the data portion or the entire response minus success flag
                        return data.data || (({success, ...rest}) => rest)(data);
                    } else {
                        throw new APIError(data.error || 'Request failed', endpoint, data);
                    }
                }
                
                return data;
                
            } catch (error) {
                console.error(`❌ API Error (attempt ${attempt}): ${endpoint}`, error);
                
                if (attempt === this.retryAttempts) {
                    throw new APIError(`Failed after ${this.retryAttempts} attempts: ${error.message}`, endpoint, error);
                }
                
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    async handleErrorResponse(response, attempt, endpoint) {
        const errorText = await response.text();
        let errorData;
        
        try {
            errorData = JSON.parse(errorText);
        } catch {
            errorData = { message: errorText };
        }
        
        const errorMessage = errorData.message || `HTTP ${response.status}`;
        
        switch (response.status) {
            case 400:
                throw new ValidationError(errorMessage, errorData);
            case 401:
                console.warn('Authentication failed, clearing token');
                this.logout();
                throw new APIError('Authentication required', endpoint, errorData);
            case 404:
                // Return empty fallback data for 404s to prevent crashes
                console.warn(`⚠️ Resource not found: ${endpoint}, using fallback data`);
                if (attempt >= this.retryAttempts) {
                    return this.getFallbackData(endpoint);
                }
                return; // Continue retry for other attempts
            case 500:
            case 502:
            case 503:
                console.error(`🔄 Server error (${response.status}):`, {
                    endpoint,
                    attempt,
                    error: errorMessage,
                    timestamp: new Date().toISOString()
                });
                
                if (attempt < this.retryAttempts) {
                    console.log(`🔄 Retrying after server error...`);
                    await this.delay(this.retryDelay * attempt);
                    return;
                }
                throw new ServerError(errorMessage, errorData);
            default:
                throw new APIError(`HTTP ${response.status}: ${errorMessage}`, endpoint, errorData);
        }
    }

    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
            const data = await response.json();
            
            // Handle backend response format {success, data} vs direct data
            if (data && typeof data === 'object' && 'success' in data) {
                if (data.success) {
                    return data.data || data; // Return data field or entire object
                } else {
                    throw new APIError(data.error || 'Request failed', '', data);
                }
            }
            
            return data; // Return data as-is if not in {success, data} format
        }
        
        if (contentType?.includes('text/')) {
            return await response.text();
        }
        
        return await response.blob();
    }

    getFallbackData(endpoint) {
        // Provide sensible fallback data for common endpoints
        if (endpoint.includes('/quizzes')) {
            return [];
        }
        if (endpoint.includes('/sessions')) {
            return null;
        }
        return {};
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // HTTP helper methods
    async get(endpoint, options = {}) {
        return this.makeRequest(endpoint, { method: 'GET', ...options });
    }

    async post(endpoint, data = null, options = {}) {
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    }

    async put(endpoint, data = null, options = {}) {
        return this.makeRequest(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    }

    async delete(endpoint, options = {}) {
        return this.makeRequest(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    // ============== AUTHENTICATION ==============

    async login(email, password) {
        try {
            // Clear any existing authentication before login
            this.logout();
            
            // Make login request without authentication headers
            const response = await this.makeRequest('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // Explicitly no Authorization header
                },
                body: JSON.stringify({ email, password })
            });
            
            this.authToken = response.token;
            this.currentUser = response.user;
            this.isAuthenticated = true;
            
            // Store token and update headers
            localStorage.setItem('quiz-auth-token', this.authToken);
            this.defaultHeaders.Authorization = `Bearer ${this.authToken}`;
            
            console.log('✅ Logged in successfully:', this.currentUser.name);
            return response;
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            this.validateUserData(userData);
            const response = await this.post('/auth/register', userData);
            
            console.log('✅ Registration successful');
            return response;
        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw error;
        }
    }

    async getProfile() {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated');
            }
            
            const response = await this.get('/auth/me');
            this.currentUser = response.user;
            this.isAuthenticated = true;
            
            console.log('✅ Authentication verified:', this.currentUser.name);
            return this.currentUser;
        } catch (error) {
            console.warn('Authentication failed, clearing token');
            this.logout();
            
            // Fallback to mock user for development
            return {
                id: 'dev-user',
                name: 'Developer',
                email: 'dev@example.com'
            };
        }
    }

    logout() {
        try {
            if (this.authToken) {
                this.post('/auth/logout').catch(() => {}); // Don't wait for response
            }
        } catch (error) {
            console.warn('Logout request failed, continuing with local cleanup');
        }
        
        // Clear local state
        this.authToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem('quiz-auth-token');
        delete this.defaultHeaders.Authorization;
        
        console.log('✅ Logged out successfully');
    }

    // ============== QUIZ MANAGEMENT ==============

    async getAllQuizzes() {
        try {
            const response = await this.get('/quizzes');
            return Array.isArray(response) ? response : response.quizzes || [];
        } catch (error) {
            console.warn('Failed to load quizzes, using fallback data');
            return this.getMockQuizzes();
        }
    }

    async getQuiz(quizId) {
        try {
            this.validateQuizId(quizId);
            const response = await this.get(`/quizzes/${quizId}`);
            return response;
        } catch (error) {
            console.warn(`Failed to load quiz ${quizId}, using fallback`);
            return this.getMockQuiz(quizId);
        }
    }

    async createQuiz(quizData) {
        try {
            this.validateQuizData(quizData);
            const cleanData = this.sanitizeQuizData(quizData);
            
            const response = await this.post('/quizzes', cleanData);
            
            console.log(`✅ Created quiz: ${response.title}`);
            return response;
        } catch (error) {
            console.error('❌ Failed to create quiz:', error);
            throw error;
        }
    }

    async updateQuiz(quizId, quizData) {
        try {
            this.validateQuizId(quizId);
            this.validateQuizData(quizData);
            
            // Ensure updatedAt timestamp
            const cleanData = {
                ...quizData,
                updatedAt: new Date().toISOString()
            };

            const response = await this.put(`/quizzes/${quizId}`, cleanData);
            
            console.log(`✅ Updated quiz: ${response.title}`);
            return response;
        } catch (error) {
            console.error('❌ Failed to update quiz:', error);
            throw error;
        }
    }

    async deleteQuiz(quizId) {
        try {
            this.validateQuizId(quizId);
            await this.delete(`/quizzes/${quizId}`);
            
            console.log(`✅ Deleted quiz: ${quizId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete quiz:', error);
            throw error;
        }
    }

    // ============== PARTICIPANTS ==============

    async addParticipant(quizId, participantData) {
        try {
            this.validateQuizId(quizId);
            this.validateParticipantData(participantData);
            
            const response = await this.post(`/quizzes/${quizId}/participants`, participantData);
            
            console.log(`✅ Added participant: ${participantData.name}`);
            return response;
        } catch (error) {
            console.error('❌ Failed to add participant:', error);
            throw error;
        }
    }

    async removeParticipant(quizId, participantId) {
        try {
            this.validateQuizId(quizId);
            
            await this.delete(`/quizzes/${quizId}/participants/${participantId}`);
            
            console.log(`✅ Removed participant: ${participantId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to remove participant:', error);
            throw error;
        }
    }

    // ============== SESSIONS ==============

    async createSession(quizId) {
        try {
            this.validateQuizId(quizId);
            const response = await this.post('/sessions', { quizId });
            
            console.log(`✅ Created session for quiz ${quizId}`);
            return response;
        } catch (error) {
            console.error('❌ Failed to create session:', error);
            throw error;
        }
    }

    async getSession(sessionId) {
        try {
            const response = await this.get(`/sessions/${sessionId}`);
            return response;
        } catch (error) {
            console.error('❌ Failed to get session:', error);
            throw error;
        }
    }

    async startSession(sessionId) {
        try {
            const response = await this.post(`/sessions/${sessionId}/start`);
            console.log(`✅ Started session ${sessionId}`);
            return response;
        } catch (error) {
            console.error('❌ Failed to start session:', error);
            throw error;
        }
    }

    async endSession(sessionId) {
        try {
            const response = await this.post(`/sessions/${sessionId}/end`);
            console.log(`✅ Ended session ${sessionId}`);
            return response;
        } catch (error) {
            console.error('❌ Failed to end session:', error);
            throw error;
        }
    }

    async updateSessionState(sessionId, state) {
        try {
            // Use PUT to update session state - backend might have this endpoint
            const response = await this.put(`/sessions/${sessionId}`, state);
            console.log(`✅ Updated session state ${sessionId}`);
            return response;
        } catch (error) {
            console.warn('⚠️ Session state update failed, continuing...', error);
            // Don't throw for state updates as they're not critical
            return null;
        }
    }

    async submitAnswer(answerData) {
        try {
            // Submit answer to session - this might be handled by participants routes
            const response = await this.post(`/participants/answer`, answerData);
            console.log('✅ Answer submitted successfully');
            return response;
        } catch (error) {
            console.error('❌ Failed to submit answer:', error);
            throw error;
        }
    }

    // ============== VALIDATION HELPERS ==============

    validateQuizId(quizId) {
        if (!quizId || typeof quizId !== 'string') {
            throw new ValidationError('Valid quiz ID is required');
        }
    }

    validateQuizData(quizData) {
        if (!quizData || typeof quizData !== 'object') {
            throw new ValidationError('Valid quiz data is required');
        }
        
        if (!quizData.title || quizData.title.trim().length === 0) {
            throw new ValidationError('Quiz title is required');
        }
        
        if (!Array.isArray(quizData.questions)) {
            throw new ValidationError('Quiz must have questions array');
        }
    }

    validateUserData(userData) {
        if (!userData || typeof userData !== 'object') {
            throw new ValidationError('Valid user data is required');
        }
        
        if (!userData.email || !userData.email.includes('@')) {
            throw new ValidationError('Valid email is required');
        }
        
        if (!userData.password || userData.password.length < 6) {
            throw new ValidationError('Password must be at least 6 characters');
        }
    }

    validateParticipantData(participantData) {
        if (!participantData || typeof participantData !== 'object') {
            throw new ValidationError('Valid participant data is required');
        }
        
        if (!participantData.name || participantData.name.trim().length === 0) {
            throw new ValidationError('Participant name is required');
        }
    }

    sanitizeQuizData(quizData) {
        return {
            title: quizData.title?.trim() || '',
            description: quizData.description?.trim() || '',
            questions: quizData.questions || [],
            published: Boolean(quizData.published),
            createdAt: quizData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    // ============== MOCK DATA FOR DEVELOPMENT ==============

    getMockQuizzes() {
        return [
            {
                id: 'mock-quiz-1',
                title: 'Sample Quiz',
                description: 'A sample quiz for testing',
                questions: [],
                published: false,
                createdAt: new Date().toISOString()
            }
        ];
    }

    getMockQuiz(quizId) {
        return {
            id: quizId,
            title: 'Mock Quiz',
            description: 'This is a fallback quiz',
            questions: [],
            published: false,
            createdAt: new Date().toISOString()
        };
    }
}

// Export singleton instance
const API = new APIService();
export default API;

// Also export error classes for external use
export { APIError, ValidationError, ServerError };
