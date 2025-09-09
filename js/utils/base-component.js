/**
 * Base Component Class
 * Provides common functionality for all quiz components
 */

import API from '../api.js';

export class BaseComponent {
    constructor(app) {
        this.app = app;
        this.api = API;
        this.realtime = app.realtime;
        this.state = app.state;
        
        // Event cleanup tracking
        this.eventListeners = [];
        this.intervals = [];
        this.timeouts = [];
        
        // Component state
        this.isInitialized = false;
        this.isDestroyed = false;
    }

    /**
     * Initialize component - override in subclasses
     */
    async init(params = {}) {
        if (this.isInitialized) {
            console.warn(`Component ${this.constructor.name} already initialized`);
            return;
        }
        
        console.log(`🔧 Initializing ${this.constructor.name}`);
        this.isInitialized = true;
        
        // Setup common event listeners
        this.setupBaseEventListeners();
        
        // Call subclass initialization
        if (this.onInit) {
            await this.onInit(params);
        }
    }

    /**
     * Cleanup component resources
     */
    destroy() {
        if (this.isDestroyed) return;
        
        console.log(`🧹 Cleaning up ${this.constructor.name}`);
        
        // Clear all tracked event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        // Clear all intervals
        this.intervals.forEach(intervalId => clearInterval(intervalId));
        this.intervals = [];
        
        // Clear all timeouts
        this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.timeouts = [];
        
        // Call subclass cleanup
        if (this.onDestroy) {
            this.onDestroy();
        }
        
        this.isDestroyed = true;
    }

    /**
     * Add event listener with automatic cleanup
     */
    addEventListener(element, event, handler, options = {}) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) {
            console.warn(`Element not found for event listener: ${event}`);
            return;
        }
        
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler });
    }

    /**
     * Add delegated event listener with automatic cleanup
     */
    addDelegatedEventListener(parent, selector, event, handler) {
        const delegatedHandler = (e) => {
            if (e.target.matches(selector) || e.target.closest(selector)) {
                handler(e);
            }
        };
        
        this.addEventListener(parent, event, delegatedHandler);
    }

    /**
     * Set interval with automatic cleanup
     */
    setInterval(callback, interval) {
        const intervalId = setInterval(callback, interval);
        this.intervals.push(intervalId);
        return intervalId;
    }

    /**
     * Set timeout with automatic cleanup
     */
    setTimeout(callback, timeout) {
        const timeoutId = setTimeout(callback, timeout);
        this.timeouts.push(timeoutId);
        return timeoutId;
    }

    /**
     * Setup common event listeners
     */
    setupBaseEventListeners() {
        // Listen for app state changes
        if (this.state && this.state.subscribe) {
            this.state.subscribe((newState) => {
                if (this.onStateChange) {
                    this.onStateChange(newState);
                }
            });
        }
        
        // Listen for realtime events
        if (this.realtime) {
            this.realtime.on('connection_status', (status) => {
                if (this.onConnectionStatusChange) {
                    this.onConnectionStatusChange(status);
                }
            });
        }
    }

    /**
     * Show error message
     */
    showError(message, duration = 5000) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        this.setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, duration);
    }

    /**
     * Show success message
     */
    showSuccess(message, duration = 3000) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        this.setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, duration);
    }

    /**
     * Update component view - override in subclasses
     */
    render(data) {
        if (this.onRender) {
            return this.onRender(data);
        }
        console.warn(`Component ${this.constructor.name} has no render method`);
    }

    /**
     * Get container element
     */
    getContainer() {
        return document.getElementById('content') || document.body;
    }

    /**
     * Update container content
     */
    updateContainer(html) {
        const container = this.getContainer();
        if (container) {
            container.innerHTML = html;
        }
    }

    /**
     * Common error handling
     */
    async handleApiError(error, operation = 'Operation') {
        console.error(`❌ ${operation} failed:`, error);
        
        if (error.name === 'ValidationError') {
            this.showError(`Validation error: ${error.message}`);
        } else if (error.name === 'ServerError') {
            this.showError(`Server error: ${error.message}`);
        } else {
            this.showError(`${operation} failed: ${error.message}`);
        }
    }

    /**
     * Lifecycle hooks - override in subclasses
     */
    async onInit(params) {
        // Override in subclass
    }

    onDestroy() {
        // Override in subclass
    }

    onStateChange(newState) {
        // Override in subclass
    }

    onConnectionStatusChange(status) {
        // Override in subclass
    }

    onRender(data) {
        // Override in subclass
    }
}

export default BaseComponent;
