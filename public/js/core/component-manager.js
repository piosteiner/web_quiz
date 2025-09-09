/**
 * Unified Component Manager
 * Handles component lifecycle, event management, and prevents memory leaks
 */

import { BaseComponent } from '../utils/base-component.js';

export class ComponentManager {
    constructor(app) {
        this.app = app;
        this.components = new Map();
        this.eventListeners = new Map(); // Track all event listeners by component
        this.globalEventHandlers = new Set(); // Track global handlers
    }

    /**
     * Register a component with proper lifecycle management
     */
    async registerComponent(name, ComponentClass, params = {}) {
        // Cleanup existing component if it exists
        if (this.components.has(name)) {
            await this.cleanupComponent(name);
        }

        console.log(`🔧 Registering component: ${name}`);
        
        // Create component instance
        const component = new ComponentClass(this.app);
        this.components.set(name, component);
        this.eventListeners.set(name, []);

        // Initialize with lifecycle protection
        if (component.init && !component._isInitialized) {
            await component.init(params);
            component._isInitialized = true;
        }

        return component;
    }

    /**
     * Add event listener with automatic cleanup tracking
     */
    addEventListener(componentName, element, event, handler, options = {}) {
        if (!this.eventListeners.has(componentName)) {
            this.eventListeners.set(componentName, []);
        }

        // Wrap handler to include component name for debugging
        const wrappedHandler = (e) => {
            try {
                handler.call(this.components.get(componentName), e);
            } catch (error) {
                console.error(`Error in ${componentName} event handler (${event}):`, error);
            }
        };

        element.addEventListener(event, wrappedHandler, options);
        
        // Track for cleanup
        this.eventListeners.get(componentName).push({
            element,
            event,
            handler: wrappedHandler,
            options
        });
    }

    /**
     * Add global event listener (document/window level)
     */
    addGlobalEventListener(componentName, target, event, handler, options = {}) {
        const wrappedHandler = (e) => {
            try {
                handler.call(this.components.get(componentName), e);
            } catch (error) {
                console.error(`Error in ${componentName} global event handler (${event}):`, error);
            }
        };

        target.addEventListener(event, wrappedHandler, options);
        
        // Track for cleanup
        if (!this.eventListeners.has(componentName)) {
            this.eventListeners.set(componentName, []);
        }
        
        this.eventListeners.get(componentName).push({
            element: target,
            event,
            handler: wrappedHandler,
            options,
            isGlobal: true
        });
    }

    /**
     * Clean up a specific component
     */
    async cleanupComponent(name) {
        console.log(`🧹 Cleaning up component: ${name}`);
        
        const component = this.components.get(name);
        if (component) {
            // Call component cleanup if it exists
            if (component.cleanup && typeof component.cleanup === 'function') {
                await component.cleanup();
            }
            
            // Clear initialization flag
            component._isInitialized = false;
        }

        // Remove all event listeners for this component
        const listeners = this.eventListeners.get(name) || [];
        listeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        
        this.eventListeners.set(name, []);
    }

    /**
     * Get component instance
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Clean up all components
     */
    async cleanupAll() {
        console.log('🧹 Cleaning up all components');
        
        for (const [name] of this.components) {
            await this.cleanupComponent(name);
        }
        
        this.components.clear();
        this.eventListeners.clear();
    }

    /**
     * Reinitialize a component (cleanup + register)
     */
    async reinitializeComponent(name, ComponentClass, params = {}) {
        await this.cleanupComponent(name);
        return await this.registerComponent(name, ComponentClass, params);
    }
}
