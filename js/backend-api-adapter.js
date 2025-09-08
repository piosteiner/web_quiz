// Backend API Integration Layer for Cloud API Service
import CONFIG from './config.js';

// API endpoint mappings for backend integration
export const API_ENDPOINTS = {
    // Authentication
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    
    // Quiz Management
    QUIZZES: '/api/quiz',
    CREATE_QUIZ: '/api/quiz',
    UPDATE_QUIZ: (id) => `/api/quiz/${id}`,
    DELETE_QUIZ: (id) => `/api/quiz/${id}`,
    PUBLISH_QUIZ: (id) => `/api/quiz/${id}/publish`,
    
    // Session Management
    CREATE_SESSION: '/api/session/create',
    START_SESSION: (id) => `/api/session/${id}/start`,
    END_SESSION: (id) => `/api/session/${id}/end`,
    SESSION_STATUS: (id) => `/api/session/${id}/status`,
    
    // Statistics
    QUIZ_STATS: (id) => `/api/quiz/${id}/stats`,
    SESSION_RESULTS: (id) => `/api/session/${id}/results`
};

// Backend API adapter for existing cloud API
export class BackendAPIAdapter {
    constructor(cloudAPIInstance) {
        this.cloudAPI = cloudAPIInstance;
        this.initializeBackendIntegration();
    }

    initializeBackendIntegration() {
        // Override specific methods to use backend endpoints
        this.overrideEndpoints();
    }

    overrideEndpoints() {
        // Store original methods
        const originalMethods = {
            getQuizzes: this.cloudAPI.getQuizzes.bind(this.cloudAPI),
            createQuiz: this.cloudAPI.createQuiz.bind(this.cloudAPI),
            updateQuiz: this.cloudAPI.updateQuiz.bind(this.cloudAPI),
            deleteQuiz: this.cloudAPI.deleteQuiz.bind(this.cloudAPI),
            publishQuiz: this.cloudAPI.publishQuiz.bind(this.cloudAPI),
            createLiveSession: this.cloudAPI.createLiveSession.bind(this.cloudAPI)
        };

        // Override with backend-compatible methods
        this.cloudAPI.getQuizzes = async () => {
            try {
                if (!this.cloudAPI.isOnline) {
                    return this.cloudAPI.getCachedData('quizzes') || [];
                }
                
                const quizzes = await this.cloudAPI.makeRequest(API_ENDPOINTS.QUIZZES);
                this.cloudAPI.cacheData('quizzes', quizzes);
                return quizzes;
            } catch (error) {
                console.warn('Failed to fetch quizzes from backend, using cache:', error);
                return this.cloudAPI.getCachedData('quizzes') || [];
            }
        };

        this.cloudAPI.createQuiz = async (quizData) => {
            try {
                if (!this.cloudAPI.isOnline) {
                    return this.cloudAPI.queueOperation('CREATE_QUIZ', quizData);
                }
                
                const quiz = await this.cloudAPI.makeRequest(API_ENDPOINTS.CREATE_QUIZ, {
                    method: 'POST',
                    body: JSON.stringify(quizData)
                });
                
                this.cloudAPI.updateLocalCache('quizzes', quiz, 'add');
                return quiz;
            } catch (error) {
                throw new Error(`Quiz konnte nicht erstellt werden: ${error.message}`);
            }
        };

        this.cloudAPI.updateQuiz = async (quizId, quizData) => {
            try {
                if (!this.cloudAPI.isOnline) {
                    return this.cloudAPI.queueOperation('UPDATE_QUIZ', { id: quizId, data: quizData });
                }
                
                const quiz = await this.cloudAPI.makeRequest(API_ENDPOINTS.UPDATE_QUIZ(quizId), {
                    method: 'PUT',
                    body: JSON.stringify(quizData)
                });
                
                this.cloudAPI.updateLocalCache('quizzes', quiz, 'update');
                return quiz;
            } catch (error) {
                throw new Error(`Quiz konnte nicht aktualisiert werden: ${error.message}`);
            }
        };

        this.cloudAPI.deleteQuiz = async (quizId) => {
            try {
                if (!this.cloudAPI.isOnline) {
                    return this.cloudAPI.queueOperation('DELETE_QUIZ', { id: quizId });
                }
                
                await this.cloudAPI.makeRequest(API_ENDPOINTS.DELETE_QUIZ(quizId), { method: 'DELETE' });
                
                this.cloudAPI.updateLocalCache('quizzes', { id: quizId }, 'delete');
                return true;
            } catch (error) {
                throw new Error(`Quiz konnte nicht gelöscht werden: ${error.message}`);
            }
        };

        this.cloudAPI.publishQuiz = async (quizId) => {
            try {
                const quiz = await this.cloudAPI.makeRequest(API_ENDPOINTS.PUBLISH_QUIZ(quizId), { method: 'POST' });
                
                this.cloudAPI.updateLocalCache('quizzes', quiz, 'update');
                return quiz;
            } catch (error) {
                throw new Error(`Quiz konnte nicht veröffentlicht werden: ${error.message}`);
            }
        };

        this.cloudAPI.createLiveSession = async (quizId, sessionConfig) => {
            try {
                const sessionData = {
                    quizId,
                    config: sessionConfig,
                    createdAt: new Date().toISOString()
                };
                
                return await this.cloudAPI.makeRequest(API_ENDPOINTS.CREATE_SESSION, {
                    method: 'POST',
                    body: JSON.stringify(sessionData)
                });
            } catch (error) {
                throw new Error(`Live Session konnte nicht erstellt werden: ${error.message}`);
            }
        };
    }
}

export default BackendAPIAdapter;
