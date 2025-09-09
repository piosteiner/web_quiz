/**
 * Enhanced API Client with proper error handling and retry logic
 */

export class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Make HTTP request with retry logic and proper error handling
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
                
                // Handle different response types
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
                
                // Wait before retry
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    /**
     * Handle error responses with specific error types
     */
    async handleErrorResponse(response, attempt, endpoint) {
        const errorData = await this.parseResponse(response);
        const errorMessage = errorData?.message || errorData?.error || `HTTP ${response.status}`;
        
        switch (response.status) {
            case 400:
                throw new ValidationError(errorMessage, errorData);
            case 401:
                throw new AuthenticationError(errorMessage);
            case 403:
                throw new AuthorizationError(errorMessage);
            case 404:
                throw new NotFoundError(errorMessage, endpoint);
            case 409:
                throw new ConflictError(errorMessage, errorData);
            case 422:
                throw new ValidationError(errorMessage, errorData);
            case 500:
                // Log server error details for debugging
                console.error(`🔥 Server Error (${response.status}):`, {
                    endpoint,
                    attempt,
                    error: errorData,
                    timestamp: new Date().toISOString()
                });
                
                if (attempt < this.retryAttempts) {
                    console.log(`🔄 Retrying after server error...`);
                    await this.delay(this.retryDelay * attempt);
                    return; // Continue to next attempt
                }
                throw new ServerError(errorMessage, errorData);
            default:
                throw new APIError(`HTTP ${response.status}: ${errorMessage}`, endpoint, errorData);
        }
    }

    /**
     * Parse response based on content type
     */
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

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // HTTP method helpers
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

    async patch(endpoint, data = {}) {
        return this.makeRequest(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.makeRequest(endpoint, {
            method: 'DELETE'
        });
    }
}

// Custom Error Classes
export class APIError extends Error {
    constructor(message, endpoint, originalError) {
        super(message);
        this.name = 'APIError';
        this.endpoint = endpoint;
        this.originalError = originalError;
    }
}

export class ValidationError extends APIError {
    constructor(message, validationData) {
        super(message);
        this.name = 'ValidationError';
        this.validationData = validationData;
    }
}

export class AuthenticationError extends APIError {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends APIError {
    constructor(message) {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends APIError {
    constructor(message, endpoint) {
        super(message);
        this.name = 'NotFoundError';
        this.endpoint = endpoint;
    }
}

export class ConflictError extends APIError {
    constructor(message, conflictData) {
        super(message);
        this.name = 'ConflictError';
        this.conflictData = conflictData;
    }
}

export class ServerError extends APIError {
    constructor(message, serverData) {
        super(message);
        this.name = 'ServerError';
        this.serverData = serverData;
    }
}
