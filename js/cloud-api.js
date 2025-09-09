// Cloud API Service for Quiz Management
import CONFIG from './config.js';

class CloudAPIService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.authToken = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        this.syncQueue = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_QUEUE) || '[]');
        this.isOnline = navigator.onLine;
        
        this.setupEventListeners();
        this.startSyncProcess();
    }

    setupEventListeners() {
        // Network status monitoring
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processSyncQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Authentication
    async authenticate(credentials) {
        try {
            const response = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            if (response.token) {
                this.authToken = response.token;
                localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, this.authToken);
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, response.user.id);
            }
            
            return response;
        } catch (error) {
            throw new Error(`Authentifizierung fehlgeschlagen: ${error.message}`);
        }
    }

    // Quiz CRUD Operations
    async getQuizzes() {
        try {
            if (!this.isOnline) {
                return this.getCachedData('quizzes') || [];
            }
            
            const quizzes = await this.makeRequest(CONFIG.ENDPOINTS.QUIZZES);
            this.cacheData('quizzes', quizzes);
            return quizzes;
        } catch (error) {
            console.warn('Failed to fetch quizzes from server, using cache:', error);
            return this.getCachedData('quizzes') || [];
        }
    }

    async getQuiz(quizId) {
        try {
            if (!this.isOnline) {
                // Try to find in cached quizzes
                const cachedQuizzes = this.getCachedData('quizzes') || [];
                return cachedQuizzes.find(q => q.id === quizId) || null;
            }
            
            const quiz = await this.makeRequest(`${CONFIG.ENDPOINTS.QUIZZES}/${quizId}`);
            return quiz;
        } catch (error) {
            console.warn('Failed to fetch quiz from server:', error);
            // Try cache as fallback
            const cachedQuizzes = this.getCachedData('quizzes') || [];
            return cachedQuizzes.find(q => q.id === quizId) || null;
        }
    }

    async createQuiz(quizData) {
        try {
            if (!this.isOnline) {
                return this.queueOperation('CREATE_QUIZ', quizData);
            }
            
            const quiz = await this.makeRequest(CONFIG.ENDPOINTS.CREATE_QUIZ, {
                method: 'POST',
                body: JSON.stringify(quizData)
            });
            
            this.updateLocalCache('quizzes', quiz, 'add');
            return quiz;
        } catch (error) {
            throw new Error(`Quiz konnte nicht erstellt werden: ${error.message}`);
        }
    }

    async updateQuiz(quizId, quizData) {
        try {
            if (!this.isOnline) {
                return this.queueOperation('UPDATE_QUIZ', { id: quizId, data: quizData });
            }
            
            const endpoint = CONFIG.ENDPOINTS.UPDATE_QUIZ.replace(':id', quizId);
            const quiz = await this.makeRequest(endpoint, {
                method: 'PUT',
                body: JSON.stringify(quizData)
            });
            
            this.updateLocalCache('quizzes', quiz, 'update');
            return quiz;
        } catch (error) {
            throw new Error(`Quiz konnte nicht aktualisiert werden: ${error.message}`);
        }
    }

    async deleteQuiz(quizId) {
        try {
            if (!this.isOnline) {
                return this.queueOperation('DELETE_QUIZ', { id: quizId });
            }
            
            const endpoint = CONFIG.ENDPOINTS.DELETE_QUIZ.replace(':id', quizId);
            await this.makeRequest(endpoint, { method: 'DELETE' });
            
            this.updateLocalCache('quizzes', { id: quizId }, 'delete');
            return true;
        } catch (error) {
            throw new Error(`Quiz konnte nicht gelöscht werden: ${error.message}`);
        }
    }

    async publishQuiz(quizId) {
        try {
            const endpoint = CONFIG.ENDPOINTS.PUBLISH_QUIZ.replace(':id', quizId);
            const quiz = await this.makeRequest(endpoint, { method: 'POST' });
            
            this.updateLocalCache('quizzes', quiz, 'update');
            return quiz;
        } catch (error) {
            throw new Error(`Quiz konnte nicht veröffentlicht werden: ${error.message}`);
        }
    }

    // Live Session Management
    async createLiveSession(quizId, sessionConfig) {
        try {
            const sessionData = {
                quizId,
                config: sessionConfig,
                createdAt: new Date().toISOString()
            };
            
            const session = await this.makeRequest(CONFIG.ENDPOINTS.CREATE_SESSION, {
                method: 'POST',
                body: JSON.stringify(sessionData)
            });
            
            return session;
        } catch (error) {
            throw new Error(`Live-Session konnte nicht erstellt werden: ${error.message}`);
        }
    }

    async startSession(sessionId) {
        try {
            const endpoint = CONFIG.ENDPOINTS.START_SESSION.replace(':id', sessionId);
            const session = await this.makeRequest(endpoint, { method: 'POST' });
            return session;
        } catch (error) {
            throw new Error(`Session konnte nicht gestartet werden: ${error.message}`);
        }
    }

    async endSession(sessionId) {
        try {
            const endpoint = CONFIG.ENDPOINTS.END_SESSION.replace(':id', sessionId);
            const results = await this.makeRequest(endpoint, { method: 'POST' });
            return results;
        } catch (error) {
            throw new Error(`Session konnte nicht beendet werden: ${error.message}`);
        }
    }

    async updateSessionState(sessionId, sessionState) {
        try {
            if (!this.isOnline) {
                return this.queueOperation('UPDATE_SESSION_STATE', { id: sessionId, state: sessionState });
            }

            const endpoint = CONFIG.ENDPOINTS.UPDATE_SESSION_STATE?.replace(':id', sessionId) || `/api/sessions/${sessionId}/state`;
            const response = await this.makeRequest(endpoint, {
                method: 'PUT',
                body: JSON.stringify(sessionState)
            });
            
            console.log('✅ Session state updated on server');
            return response;
        } catch (error) {
            throw new Error(`Session-Status konnte nicht aktualisiert werden: ${error.message}`);
        }
    }

    async submitAnswer(answerData) {
        try {
            if (!this.isOnline) {
                return this.queueOperation('SUBMIT_ANSWER', answerData);
            }

            const endpoint = CONFIG.ENDPOINTS.SUBMIT_ANSWER || '/api/answers/submit';
            const response = await this.makeRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify(answerData)
            });
            
            console.log('✅ Answer submitted and saved to server');
            return response;
        } catch (error) {
            throw new Error(`Antwort konnte nicht gespeichert werden: ${error.message}`);
        }
    }

    async getSessionResults(sessionId) {
        try {
            const endpoint = CONFIG.ENDPOINTS.SESSION_RESULTS.replace(':id', sessionId);
            return await this.makeRequest(endpoint);
        } catch (error) {
            throw new Error(`Session-Ergebnisse konnten nicht abgerufen werden: ${error.message}`);
        }
    }

    // Analytics and Statistics
    async getQuizStats(quizId) {
        try {
            const endpoint = CONFIG.ENDPOINTS.QUIZ_STATS.replace(':id', quizId);
            return await this.makeRequest(endpoint);
        } catch (error) {
            console.warn('Failed to fetch quiz stats:', error);
            return null;
        }
    }

    // HTTP Request Helper
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (this.authToken) {
            defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        const config = {
            method: 'GET',
            headers: { ...defaultHeaders, ...options.headers },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.handleAuthError();
                    throw new Error('Nicht autorisiert');
                }
                throw new Error(`Server-Fehler: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Netzwerkfehler - Server nicht erreichbar');
            }
            throw error;
        }
    }

    // Offline Support
    queueOperation(type, data) {
        const operation = {
            id: Date.now(),
            type,
            data,
            timestamp: new Date().toISOString(),
            retries: 0
        };
        
        this.syncQueue.push(operation);
        localStorage.setItem(CONFIG.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
        
        // Return a temporary local result
        return { ...data, id: operation.id, _pending: true };
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) return;
        
        const queue = [...this.syncQueue];
        this.syncQueue = [];
        
        for (const operation of queue) {
            try {
                await this.processQueuedOperation(operation);
            } catch (error) {
                console.warn('Failed to sync operation:', operation, error);
                
                // Retry logic
                if (operation.retries < 3) {
                    operation.retries++;
                    this.syncQueue.push(operation);
                }
            }
        }
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
    }

    async processQueuedOperation(operation) {
        switch (operation.type) {
            case 'CREATE_QUIZ':
                return await this.createQuiz(operation.data);
            case 'UPDATE_QUIZ':
                return await this.updateQuiz(operation.data.id, operation.data.data);
            case 'DELETE_QUIZ':
                return await this.deleteQuiz(operation.data.id);
            case 'UPDATE_SESSION_STATE':
                return await this.updateSessionState(operation.data.id, operation.data.state);
            case 'SUBMIT_ANSWER':
                return await this.submitAnswer(operation.data);
            default:
                throw new Error(`Unbekannter Operationstyp: ${operation.type}`);
        }
    }

    // Cache Management
    cacheData(key, data) {
        const cacheEntry = {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + CONFIG.DEFAULTS.CACHE_EXPIRY
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
    }

    getCachedData(key) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (!cached) return null;
            
            const cacheEntry = JSON.parse(cached);
            if (Date.now() > cacheEntry.expiry) {
                localStorage.removeItem(`cache_${key}`);
                return null;
            }
            
            return cacheEntry.data;
        } catch (error) {
            console.warn('Cache read error:', error);
            return null;
        }
    }

    updateLocalCache(key, item, action) {
        const cached = this.getCachedData(key) || [];
        let updated;
        
        switch (action) {
            case 'add':
                updated = [...cached, item];
                break;
            case 'update':
                updated = cached.map(i => i.id === item.id ? { ...i, ...item } : i);
                break;
            case 'delete':
                updated = cached.filter(i => i.id !== item.id);
                break;
            default:
                return;
        }
        
        this.cacheData(key, updated);
    }

    // Periodic sync
    startSyncProcess() {
        setInterval(() => {
            if (this.isOnline) {
                this.processSyncQueue();
            }
        }, CONFIG.DEFAULTS.SYNC_INTERVAL);
    }

    // Error Handling
    handleAuthError() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_ID);
        this.authToken = null;
        
        // Redirect to login or show login modal
        window.dispatchEvent(new CustomEvent('auth_required'));
    }

    // Utility Methods
    isConnected() {
        return this.isOnline;
    }

    getPendingOperations() {
        return this.syncQueue.length;
    }

    clearCache() {
        Object.keys(localStorage)
            .filter(key => key.startsWith('cache_'))
            .forEach(key => localStorage.removeItem(key));
    }

    // Live session participant methods
    async joinSession(code, participantName) {
        try {
            const response = await this.makeRequest(CONFIG.ENDPOINTS.JOIN_SESSION, {
                method: 'POST',
                body: JSON.stringify({
                    code: code,
                    participantName: participantName,
                    timestamp: new Date().toISOString()
                })
            });
            return response;
        } catch (error) {
            throw new Error(`Session konnte nicht beigetreten werden: ${error.message}`);
        }
    }

    async joinQuizByName(quizName, participantName) {
        try {
            const response = await this.makeRequest(CONFIG.ENDPOINTS.JOIN_QUIZ_BY_NAME, {
                method: 'POST',
                body: JSON.stringify({
                    quizName: quizName,
                    participantName: participantName,
                    timestamp: new Date().toISOString()
                })
            });
            return response;
        } catch (error) {
            throw new Error(`Quiz "${quizName}" konnte nicht beigetreten werden: ${error.message}`);
        }
    }

    async leaveSession(sessionId, participantId) {
        try {
            const endpoint = CONFIG.ENDPOINTS.LEAVE_SESSION
                .replace(':sessionId', sessionId)
                .replace(':participantId', participantId);
            
            return await this.makeRequest(endpoint, { method: 'POST' });
        } catch (error) {
            throw new Error(`Session konnte nicht verlassen werden: ${error.message}`);
        }
    }

    async submitAnswer(sessionId, participantId, answerData) {
        try {
            const endpoint = CONFIG.ENDPOINTS.SUBMIT_ANSWER.replace(':sessionId', sessionId);
            
            const response = await this.makeRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    participantId: participantId,
                    ...answerData,
                    timestamp: new Date().toISOString()
                })
            });
            
            return response;
        } catch (error) {
            throw new Error(`Antwort konnte nicht übermittelt werden: ${error.message}`);
        }
    }

    async getSessionParticipants(sessionId) {
        try {
            const endpoint = CONFIG.ENDPOINTS.SESSION_PARTICIPANTS.replace(':sessionId', sessionId);
            return await this.makeRequest(endpoint);
        } catch (error) {
            throw new Error(`Teilnehmer konnten nicht abgerufen werden: ${error.message}`);
        }
    }
}

export default CloudAPIService;
