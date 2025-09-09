/**
 * Centralized State Manager
 * Manages application state with reactive updates and persistence
 */

export class StateManager {
    constructor() {
        this.state = {
            user: null,
            session: null,
            quiz: null,
            participant: null,
            ui: {
                currentView: 'home',
                loading: false,
                error: null
            }
        };
        
        this.subscribers = new Map();
        this.history = [];
        this.maxHistorySize = 50;
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get specific state property
     */
    get(path) {
        return this.getNestedValue(this.state, path);
    }

    /**
     * Set state with reactive updates
     */
    setState(updates, source = 'unknown') {
        const previousState = { ...this.state };
        
        // Apply updates
        this.state = this.deepMerge(this.state, updates);
        
        // Add to history
        this.addToHistory(previousState, this.state, source);
        
        // Notify subscribers
        this.notifySubscribers(updates, previousState);
        
        console.log(`📊 State updated by ${source}:`, updates);
    }

    /**
     * Subscribe to state changes
     */
    subscribe(componentName, callback, filter = null) {
        if (!this.subscribers.has(componentName)) {
            this.subscribers.set(componentName, []);
        }
        
        this.subscribers.get(componentName).push({ callback, filter });
        
        console.log(`📡 Component ${componentName} subscribed to state changes`);
    }

    /**
     * Unsubscribe component from state changes
     */
    unsubscribe(componentName) {
        this.subscribers.delete(componentName);
        console.log(`📡 Component ${componentName} unsubscribed from state changes`);
    }

    /**
     * Clear user session data
     */
    clearSession() {
        this.setState({
            user: null,
            session: null,
            participant: null
        }, 'logout');
    }

    /**
     * Set loading state
     */
    setLoading(isLoading, message = '') {
        this.setState({
            ui: {
                ...this.state.ui,
                loading: isLoading,
                loadingMessage: message
            }
        }, 'loading');
    }

    /**
     * Set error state
     */
    setError(error) {
        this.setState({
            ui: {
                ...this.state.ui,
                error: error
            }
        }, 'error');
    }

    /**
     * Clear error state
     */
    clearError() {
        this.setState({
            ui: {
                ...this.state.ui,
                error: null
            }
        }, 'clear-error');
    }

    /**
     * Get state history for debugging
     */
    getHistory() {
        return [...this.history];
    }

    // Private helper methods
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    addToHistory(previousState, newState, source) {
        this.history.push({
            timestamp: new Date().toISOString(),
            source,
            previousState: { ...previousState },
            newState: { ...newState }
        });
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    notifySubscribers(updates, previousState) {
        for (const [componentName, subscriptions] of this.subscribers) {
            subscriptions.forEach(({ callback, filter }) => {
                try {
                    // Apply filter if provided
                    if (filter && !this.shouldNotify(updates, filter)) {
                        return;
                    }
                    
                    callback(this.state, updates, previousState);
                } catch (error) {
                    console.error(`Error notifying subscriber ${componentName}:`, error);
                }
            });
        }
    }

    shouldNotify(updates, filter) {
        if (typeof filter === 'string') {
            return updates.hasOwnProperty(filter);
        }
        
        if (Array.isArray(filter)) {
            return filter.some(key => updates.hasOwnProperty(key));
        }
        
        if (typeof filter === 'function') {
            return filter(updates);
        }
        
        return true;
    }
}
