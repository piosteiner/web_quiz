/**
 * Enhanced Cloud API with proper error handling and data validation
 */

import CONFIG from './config.js';

// Custom Error Classes (inline since we don't have the core module yet)
class APIError extends Error {
    constructor(message, endpoint, originalError) {
        super    async getAllQuizzes() {
        try {
            const response = await this.get('/quizzes');
            return Array.isArray(response) ? response : response.quizzes || [];sage);
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

// Simple API Client (inline)
class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

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
                console.log(`✅ API Success: ${config.method || 'GET'} ${endpoint}`);
                return data;

            } catch (error) {
                console.error(`❌ API Error (attempt ${attempt}): ${endpoint}`, error);
                
                if (attempt === this.retryAttempts) {
                    throw new APIError(`Request failed after ${this.retryAttempts} attempts: ${error.message}`, endpoint, error);
                }
                
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    async handleErrorResponse(response, attempt, endpoint) {
        const errorData = await this.parseResponse(response);
        const errorMessage = errorData?.message || errorData?.error || `HTTP ${response.status}`;
        
        switch (response.status) {
            case 400:
                throw new ValidationError(errorMessage, errorData);
            case 401:
                throw new APIError('Nicht authentifiziert', endpoint);
            case 403:
                throw new APIError('Nicht autorisiert', endpoint);
            case 404:
                throw new APIError('Nicht gefunden', endpoint);
            case 409:
                throw new ValidationError(errorMessage, errorData);
            case 422:
                throw new ValidationError(errorMessage, errorData);
            case 500:
                console.error(`🔥 Server Error (${response.status}):`, {
                    endpoint,
                    attempt,
                    error: errorData,
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
            return await response.json();
        }
        
        if (contentType?.includes('text/')) {
            return await response.text();
        }
        
        return await response.blob();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async get(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return this.makeRequest(url.pathname + url.search, {
            method: 'GET'
        });
    }

    async post(endpoint, data = {}) {
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.makeRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.makeRequest(endpoint, {
            method: 'DELETE'
        });
    }
}

class CloudAPIService extends APIClient {
    constructor() {
        super(CONFIG.API_BASE_URL || 'https://quiz-backend.piogino.ch');
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authToken = localStorage.getItem('quiz-auth-token');
        
        if (this.authToken) {
            this.defaultHeaders.Authorization = `Bearer ${this.authToken}`;
        }
    }

    /**
     * Authentication methods
     */
    async login(email, password) {
        try {
            const response = await this.post('/auth/login', { email, password });
            
            this.authToken = response.token;
            this.currentUser = response.user;
            this.isAuthenticated = true;
            
            // Store token
            localStorage.setItem('quiz-auth-token', this.authToken);
            this.defaultHeaders.Authorization = `Bearer ${this.authToken}`;
            
            console.log('✅ Login successful:', this.currentUser.name);
            return this.currentUser;
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            this.validateUserData(userData);
            const response = await this.post('/auth/register', userData);
            
            this.authToken = response.token;
            this.currentUser = response.user;
            this.isAuthenticated = true;
            
            // Store token
            localStorage.setItem('quiz-auth-token', this.authToken);
            this.defaultHeaders.Authorization = `Bearer ${this.authToken}`;
            
            console.log('✅ Registration successful:', this.currentUser.name);
            return this.currentUser;
        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw error;
        }
    }

    async authenticate() {
        if (!this.authToken) {
            // Fallback mock authentication for development
            console.log('🔄 No auth token, using fallback auth');
            return this.createMockUser();
        }

        try {
            const response = await this.get('/auth/me');
            this.currentUser = response.user;
            this.isAuthenticated = true;
            
            console.log('✅ Authentication verified:', this.currentUser.name);
            return this.currentUser;
        } catch (error) {
            console.warn('Authentication failed, clearing token');
            this.logout();
            
            // Fallback to mock user for development
            return this.createMockUser();
        }
    }

    createMockUser() {
        const mockUser = {
            id: 'mock-user-123',
            name: 'Pio Steiner',
            email: 'pio@example.com',
            role: 'admin'
        };
        
        this.currentUser = mockUser;
        this.isAuthenticated = true;
        
        console.log('🔄 Using mock authentication:', mockUser.name);
        return mockUser;
    }

    async logout() {
        try {
            if (this.authToken) {
                await this.post('/auth/logout');
            }
        } catch (error) {
            console.warn('Logout request failed:', error);
        } finally {
            // Clear local state regardless
            this.authToken = null;
            this.currentUser = null;
            this.isAuthenticated = false;
            
            localStorage.removeItem('quiz-auth-token');
            delete this.defaultHeaders.Authorization;
            
            console.log('✅ Logged out successfully');
        }
    }

    /**
     * Quiz management methods with proper data validation
     */
    async getAllQuizzes() {
        try {
            const response = await this.get('/api/quizzes');
            const quizzes = Array.isArray(response) ? response : response.quizzes || [];
            
            console.log(`✅ Loaded ${quizzes.length} quizzes`);
            return quizzes;
        } catch (error) {
            console.error('❌ Failed to load quizzes:', error);
            
            // Fallback for development/offline mode
            return this.getMockQuizzes();
        }
    }

    async getQuiz(quizId) {
        try {
            this.validateQuizId(quizId);
            const response = await this.get(`/quizzes/${quizId}`);
            
            console.log(`✅ Loaded quiz: ${response.title}`);
            return response;
        } catch (error) {
            console.error(`❌ Failed to load quiz ${quizId}:`, error);
            throw error;
        }
    }

    async createQuiz(quizData) {
        try {
            this.validateQuizData(quizData, true);
            
            // Ensure required fields for new quiz
            const cleanData = {
                ...quizData,
                id: quizData.id || this.generateQuizId(),
                createdAt: quizData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                participants: quizData.participants || [],
                questions: quizData.questions || [],
                published: false
            };

            const response = await this.post('/quizzes', cleanData);
            
            console.log(`✅ Created quiz: ${response.title}`);
            return response;
        } catch (error) {
            console.error('❌ Failed to create quiz:', error);
            
            if (error instanceof ServerError) {
                // For 500 errors, try to provide more context
                throw new Error(`Server-Fehler beim Erstellen des Quiz. Möglicherweise ist die Quiz-ID bereits vergeben. Versuchen Sie es erneut.`);
            }
            
            throw error;
        }
    }

    async updateQuiz(quizId, quizData) {
        try {
            this.validateQuizId(quizId);
            this.validateQuizData(quizData, false);
            
            // Ensure updatedAt timestamp
            const cleanData = {
                ...quizData,
                updatedAt: new Date().toISOString()
            };

            const response = await this.put(`/quizzes/${quizId}`, cleanData);
            
            console.log(`✅ Updated quiz: ${response.title}`);
            return response;
        } catch (error) {
            console.error(`❌ Failed to update quiz ${quizId}:`, error);
            
            if (error instanceof ServerError) {
                // Provide specific guidance for 500 errors
                console.error('Server error details:', {
                    quizId,
                    dataStructure: Object.keys(quizData),
                    timestamp: new Date().toISOString()
                });
                
                throw new Error(`Server-Fehler beim Aktualisieren des Quiz. Die Datenstruktur könnte inkorrekt sein. Versuchen Sie, das Quiz neu zu laden.`);
            }
            
            throw error;
        }
    }

    async deleteQuiz(quizId) {
        try {
            this.validateQuizId(quizId);
            await this.delete(`/quizzes/${quizId}`);
            
            console.log(`✅ Deleted quiz: ${quizId}`);
        } catch (error) {
            console.error(`❌ Failed to delete quiz ${quizId}:`, error);
            throw error;
        }
    }

    /**
     * Participant management
     */
    async addParticipant(quizId, participantData) {
        try {
            this.validateQuizId(quizId);
            this.validateParticipantData(participantData);
            
            const response = await this.post(`/quizzes/${quizId}/participants`, participantData);
            
            console.log(`✅ Added participant to quiz ${quizId}`);
            return response;
        } catch (error) {
            console.error(`❌ Failed to add participant to quiz ${quizId}:`, error);
            throw error;
        }
    }

    async removeParticipant(quizId, participantId) {
        try {
            this.validateQuizId(quizId);
            
            await this.delete(`/quizzes/${quizId}/participants/${participantId}`);
            
            console.log(`✅ Removed participant from quiz ${quizId}`);
        } catch (error) {
            console.error(`❌ Failed to remove participant from quiz ${quizId}:`, error);
            throw error;
        }
    }

    /**
     * Data validation methods
     */
    validateQuizId(quizId) {
        if (!quizId || typeof quizId !== 'string') {
            throw new ValidationError('Quiz-ID ist erforderlich und muss ein String sein');
        }
        
        if (quizId.length < 4 || quizId.length > 20) {
            throw new ValidationError('Quiz-ID muss zwischen 4 und 20 Zeichen lang sein');
        }
    }

    validateQuizData(quizData, isNew = false) {
        if (!quizData || typeof quizData !== 'object') {
            throw new ValidationError('Quiz-Daten sind erforderlich');
        }

        // Required fields for all quizzes
        if (!quizData.title || quizData.title.trim().length === 0) {
            throw new ValidationError('Quiz-Titel ist erforderlich');
        }

        if (isNew && !quizData.id) {
            throw new ValidationError('Quiz-ID ist für neue Quizzes erforderlich');
        }

        // Validate participants array
        if (quizData.participants && !Array.isArray(quizData.participants)) {
            throw new ValidationError('Teilnehmer müssen als Array angegeben werden');
        }

        // Validate questions array
        if (quizData.questions && !Array.isArray(quizData.questions)) {
            throw new ValidationError('Fragen müssen als Array angegeben werden');
        }

        // Validate settings object
        if (quizData.settings && typeof quizData.settings !== 'object') {
            throw new ValidationError('Einstellungen müssen als Objekt angegeben werden');
        }
    }

    validateParticipantData(participantData) {
        if (!participantData || typeof participantData !== 'object') {
            throw new ValidationError('Teilnehmer-Daten sind erforderlich');
        }

        if (!participantData.name || participantData.name.trim().length === 0) {
            throw new ValidationError('Teilnehmer-Name ist erforderlich');
        }

        if (participantData.email && !this.isValidEmail(participantData.email)) {
            throw new ValidationError('Ungültige E-Mail-Adresse');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    generateQuizId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Mock data for development/fallback
     */
    getMockQuizzes() {
        console.log('🔄 Using mock quiz data');
        return [
            {
                id: 'DEMO123',
                title: 'Demo Quiz',
                description: 'Ein Beispiel-Quiz für Testzwecke',
                participants: [],
                questions: [
                    {
                        id: '1',
                        text: 'Was ist die Hauptstadt von Deutschland?',
                        answers: [
                            { id: 'a', text: 'Berlin', correct: true },
                            { id: 'b', text: 'München', correct: false },
                            { id: 'c', text: 'Hamburg', correct: false },
                            { id: 'd', text: 'Köln', correct: false }
                        ],
                        timeLimit: 30,
                        points: 10
                    }
                ],
                settings: { timePerQuestion: 30 },
                published: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

    /**
     * Live session methods
     */
    async createSession(quizId) {
        try {
            this.validateQuizId(quizId);
            const response = await this.post('/sessions', { quizId });
            
            console.log(`✅ Created session for quiz ${quizId}`);
            return response;
        } catch (error) {
            console.error(`❌ Failed to create session for quiz ${quizId}:`, error);
            throw error;
        }
    }

    async getSession(sessionId) {
        try {
            const response = await this.get(`/sessions/${sessionId}`);
            
            console.log(`✅ Loaded session: ${sessionId}`);
            return response;
        } catch (error) {
            console.error(`❌ Failed to load session ${sessionId}:`, error);
            throw error;
        }
    }
}

export default CloudAPIService;
