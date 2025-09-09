/**
 * PiGi Quiz - Single Page Application Controller
 * Manages routing, state, and view switching for the entire application
 */

import CONFIG from './config.js';
import CloudAPIService from './cloud-api.js';
import realTimeService from './realtime.js';

class PiGiQuizApp {
    constructor() {
        this.currentView = 'home';
        this.currentUser = null;
        this.cloudAPI = new CloudAPIService();
        this.realtime = realTimeService;
        
        // Application state
        this.state = {
            user: null,
            session: null,
            quiz: null,
            participant: null
        };
        
        // Component modules (lazy loaded)
        this.components = {
            join: null,
            admin: null,
            editor: null,
            live: null,
            participant: null,
            participantJoin: null
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing PiGi Quiz App');
        
        // Setup core functionality
        this.setupRouter();
        this.setupNavigation();
        this.setupThemeSystem();
        this.setupNotifications();
        
        // Check authentication status
        await this.checkAuth();
        
        // Handle initial route
        this.handleRoute();
        
        console.log('✅ PiGi Quiz App initialized');
    }

    /**
     * Router Setup and Navigation
     */
    setupRouter() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            this.handleRoute();
        });
        
        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('[data-route]');
            const navButton = e.target.closest('[data-navigate]');
            
            if (navLink) {
                e.preventDefault();
                e.stopPropagation(); // Prevent other handlers
                const route = navLink.dataset.route;
                this.navigateTo(route);
                return;
            }
            
            if (navButton) {
                e.preventDefault();
                e.stopPropagation(); // Prevent other handlers
                const route = navButton.dataset.navigate;
                this.navigateTo(route);
                return;
            }
        }, true); // Use capture phase to handle before others
    }

    setupNavigation() {
        // Update active nav link
        this.updateNavigation();
    }

    navigateTo(route, state = {}) {
        // Update URL without page reload
        const url = route === 'home' ? '/' : `/#${route}`;
        window.history.pushState({ route, ...state }, '', url);
        
        // Update view
        this.switchToView(route);
    }

    handleRoute() {
        const hash = window.location.hash.slice(1); // Remove #
        const route = hash || 'home';
        
        // Parse query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const queryState = {};
        for (const [key, value] of urlParams) {
            queryState[key] = value;
        }
        
        // Check for participant join
        if (urlParams.get('quiz') && urlParams.get('join') === 'true') {
            this.switchToView('participantJoin', queryState);
        } else {
            this.switchToView(route, queryState);
        }
    }

    async switchToView(viewName, params = {}) {
        console.log(`🔄 Switching to view: ${viewName}`);
        
        // Hide all views
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            // Load component if needed
            await this.loadComponent(viewName, params);
            
            // Update navigation
            this.updateNavigation();
        } else {
            console.warn(`View not found: ${viewName}`);
            this.navigateTo('home');
        }
    }

    updateNavigation() {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-route="${this.currentView}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Show/hide live control nav based on session
        const liveNavLink = document.querySelector('[data-route="live"]');
        if (liveNavLink) {
            liveNavLink.style.display = this.state.session ? 'block' : 'none';
        }
    }

    /**
     * Component Loading (Lazy Loading)
     */
    async loadComponent(componentName, params = {}) {
        if (componentName === 'home') {
            this.initHomeView();
            return;
        }
        
        try {
            switch (componentName) {
                case 'join':
                    // Check if this is a participant join request
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('quiz') && urlParams.get('join') === 'true') {
                        if (!this.components.participantJoin) {
                            const { ParticipantJoin } = await import('./components/participant-join.js');
                            this.components.participantJoin = new ParticipantJoin(this);
                        }
                        await this.components.participantJoin.init(params);
                    } else {
                        if (!this.components.join) {
                            const { QuizParticipant } = await import('./components/quiz-participant.js');
                            this.components.join = new QuizParticipant(this);
                        }
                        await this.components.join.init(params);
                    }
                    break;
                    
                case 'participantJoin':
                    if (!this.components.participantJoin) {
                        const { ParticipantJoin } = await import('./components/participant-join.js');
                        this.components.participantJoin = new ParticipantJoin(this);
                    }
                    await this.components.participantJoin.init(params);
                    break;
                    
                case 'participant':
                    if (!this.components.participant) {
                        const { Participant } = await import('./components/participant.js');
                        this.components.participant = new Participant(this);
                    }
                    await this.components.participant.init(params);
                    break;
                    
                case 'admin':
                    if (!this.components.admin) {
                        const QuizAdminModule = await import('./components/quiz-admin.js');
                        this.components.admin = new QuizAdminModule.QuizAdmin(this);
                    }
                    if (!this.components.editor) {
                        const QuizEditorModule = await import('./components/quiz-editor.js');
                        this.components.editor = new QuizEditorModule.QuizEditor(this);
                    }
                    await this.components.admin.init(params);
                    await this.components.editor.init(params);
                    break;
                    
                case 'quiz-admin':
                    if (!this.components.admin) {
                        const QuizAdminModule = await import('./components/quiz-admin.js');
                        this.components.admin = new QuizAdminModule.QuizAdmin(this);
                    }
                    await this.components.admin.init(params);
                    break;
                    
                case 'live':
                    if (!this.components.live) {
                        const { LiveController } = await import('./components/live-controller.js');
                        this.components.live = new LiveController(this);
                    }
                    await this.components.live.init(params);
                    break;
            }
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            this.showNotification(`Fehler beim Laden der Komponente: ${error.message}`, 'error');
        }
    }

    initHomeView() {
        // Home view is static, just ensure proper setup
        this.setupQuizPreview();
    }

    setupQuizPreview() {
        // Quiz preview is already in HTML, no dynamic loading needed
        // Could add animation or dynamic content here if needed
    }

    /**
     * Theme System
     */
    setupThemeSystem() {
        const themeToggle = document.getElementById('theme-toggle');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('pigi-quiz-theme') || (prefersDark ? 'dark' : 'light');
        
        // Set initial theme
        this.setTheme(savedTheme);
        
        // Theme toggle handler
        themeToggle?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        });
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('pigi-quiz-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pigi-quiz-theme', theme);
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    /**
     * Authentication
     */
    async checkAuth() {
        const token = localStorage.getItem('quiz_auth_token');
        const userData = localStorage.getItem('quiz_user_data');
        
        if (token && userData) {
            try {
                this.state.user = JSON.parse(userData);
                // Validate token with server if needed
                console.log('✅ User authenticated:', this.state.user.name);
            } catch (error) {
                console.warn('Invalid stored user data, clearing:', error);
                this.logout();
            }
        }
    }

    login(userData, token) {
        this.state.user = userData;
        localStorage.setItem('quiz_auth_token', token);
        localStorage.setItem('quiz_user_data', JSON.stringify(userData));
        
        this.showNotification(`Willkommen, ${userData.name}!`, 'success');
        this.updateNavigation();
    }

    logout() {
        this.state.user = null;
        localStorage.removeItem('quiz_auth_token');
        localStorage.removeItem('quiz_user_data');
        
        this.showNotification('Erfolgreich abgemeldet', 'info');
        this.navigateTo('home');
    }

    /**
     * Session Management
     */
    setSession(sessionData) {
        this.state.session = sessionData;
        this.updateNavigation();
    }

    clearSession() {
        this.state.session = null;
        this.updateNavigation();
    }

    /**
     * Notification System
     */
    setupNotifications() {
        // Notification container already in HTML
    }

    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Add show class for animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Loading States
     */
    showLoading(message = 'Wird geladen...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Utility Methods
     */
    getState() {
        return { ...this.state };
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    getCurrentView() {
        return this.currentView;
    }

    // API access for components
    getCloudAPI() {
        return this.cloudAPI;
    }

    getRealtime() {
        return this.realtime;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create app instance immediately and set global reference
    const app = new PiGiQuizApp();
    window.PiGiQuizApp = app;
    
    // Set window.app immediately without property descriptor complexity
    window.app = app;
    console.log('✅ Global app instance created');
    
    // Add global error handler for button clicks when app is not ready
    window.addEventListener('error', (event) => {
        if (event.message.includes("can't access property") && event.message.includes('window.app')) {
            console.warn('App not ready for button click, retrying...', event);
            // Small delay to allow app to initialize
            setTimeout(() => {
                if (window.app && window.app.components) {
                    console.log('App is now ready');
                }
            }, 100);
        }
    });
    
    // Add global safety check for inline handlers
    window.safeCallApp = function(componentName, methodName, ...args) {
        try {
            if (window.app && window.app.components && window.app.components[componentName]) {
                return window.app.components[componentName][methodName](...args);
            } else {
                console.warn(`App or component ${componentName} not ready, waiting...`);
                // Wait for component to be ready
                let attempts = 0;
                const maxAttempts = 50; // 5 seconds max
                const checkAndCall = () => {
                    attempts++;
                    if (window.app && window.app.components && window.app.components[componentName]) {
                        console.log(`Component ${componentName} now ready, calling ${methodName}`);
                        return window.app.components[componentName][methodName](...args);
                    } else if (attempts < maxAttempts) {
                        setTimeout(checkAndCall, 100);
                    } else {
                        console.error(`Component ${componentName} failed to load after ${maxAttempts * 100}ms`);
                    }
                };
                setTimeout(checkAndCall, 100);
            }
        } catch (error) {
            console.error(`Error calling ${componentName}.${methodName}:`, error);
        }
    };
    
    // Create a safer window.app wrapper for inline handlers
    window.app = new Proxy(app, {
        get(target, prop) {
            if (prop === 'components') {
                return new Proxy(target.components, {
                    get(componentTarget, componentProp) {
                        if (!componentTarget[componentProp]) {
                            console.warn(`Component ${componentProp} not yet loaded`);
                            // Return a proxy that delays method calls
                            return new Proxy({}, {
                                get(methodTarget, methodProp) {
                                    return (...args) => {
                                        window.safeCallApp(componentProp, methodProp, ...args);
                                    };
                                }
                            });
                        }
                        return componentTarget[componentProp];
                    }
                });
            }
            return target[prop];
        }
    });
});

// Export for module use
export default PiGiQuizApp;
