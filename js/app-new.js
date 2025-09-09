/**
 * PiGi Quiz - Single Page Application Controller
 * Manages routing, state, and view switching for the entire application
 */

import CONFIG from './config.js';
import CloudAPIService from './cloud-api.js?v=1.0.7';
import realTimeService from './realtime.js';
import { ComponentManager } from './core/component-manager.js';
import { StateManager } from './core/state-manager.js';

class PiGiQuizApp {
    constructor() {
        // Initialize core managers
        this.stateManager = new StateManager();
        this.componentManager = new ComponentManager(this);
        
        // Initialize services
        this.cloudAPI = new CloudAPIService();
        this.realtime = realTimeService;
        
        // Legacy compatibility
        this.currentView = 'home';
        this.currentUser = null;
        this.components = {}; // Legacy component access
        
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
                const route = navLink.dataset.route;
                this.navigateTo(route);
            }
            
            if (navButton) {
                e.preventDefault();
                const route = navButton.dataset.navigate;
                this.navigateTo(route);
            }
        });
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
            const hasSession = this.stateManager.get('session');
            liveNavLink.style.display = hasSession ? 'block' : 'none';
        }
    }

    async loadComponent(componentName, params = {}) {
        if (componentName === 'home') {
            this.initHomeView();
            return;
        }
        
        try {
            // Component mapping with new architecture
            const componentMap = {
                'join': async () => {
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('quiz') && urlParams.get('join') === 'true') {
                        const { ParticipantJoin } = await import('./components/participant-join.js');
                        const component = await this.componentManager.registerComponent('participantJoin', ParticipantJoin, params);
                        this.components.participantJoin = component; // Legacy compatibility
                        return component;
                    } else {
                        const { QuizParticipant } = await import('./components/quiz-participant.js');
                        const component = await this.componentManager.registerComponent('join', QuizParticipant, params);
                        this.components.join = component; // Legacy compatibility
                        return component;
                    }
                },
                'participantJoin': async () => {
                    const { ParticipantJoin } = await import('./components/participant-join.js');
                    const component = await this.componentManager.registerComponent('participantJoin', ParticipantJoin, params);
                    this.components.participantJoin = component;
                    return component;
                },
                'participant': async () => {
                    const { Participant } = await import('./components/participant.js');
                    const component = await this.componentManager.registerComponent('participant', Participant, params);
                    this.components.participant = component;
                    return component;
                },
                'admin': async () => {
                    const QuizAdminModule = await import('./components/quiz-admin.js');
                    const adminComponent = await this.componentManager.registerComponent('admin', QuizAdminModule.QuizAdmin, params);
                    this.components.admin = adminComponent;
                    
                    // Also load editor for admin view
                    const QuizEditorModule = await import('./components/quiz-editor.js');
                    const editorComponent = await this.componentManager.registerComponent('editor', QuizEditorModule.QuizEditor, params);
                    this.components.editor = editorComponent;
                    
                    return adminComponent;
                },
                'quiz-admin': async () => {
                    const QuizAdminModule = await import('./components/quiz-admin.js');
                    const component = await this.componentManager.registerComponent('admin', QuizAdminModule.QuizAdmin, params);
                    this.components.admin = component;
                    return component;
                },
                'live': async () => {
                    const { LiveController } = await import('./components/live-controller.js');
                    const component = await this.componentManager.registerComponent('live', LiveController, params);
                    this.components.live = component;
                    return component;
                }
            };

            if (componentMap[componentName]) {
                return await componentMap[componentName]();
            } else {
                console.warn(`Unknown component: ${componentName}`);
            }
            
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            this.showNotification(`Fehler beim Laden der Komponente: ${error.message}`, 'error');
        }
    }

    initHomeView() {
        // Home view initialization
        this.setupQuizPreview();
    }

    setupQuizPreview() {
        // Preview functionality setup
    }

    /**
     * Theme System
     */
    setupThemeSystem() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Load saved theme
        const savedTheme = localStorage.getItem('quiz-theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('quiz-theme', theme);
        
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    /**
     * Notification System
     */
    setupNotifications() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        
        notification.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    }

    /**
     * Authentication
     */
    async checkAuth() {
        try {
            const user = await this.cloudAPI.authenticate();
            if (user) {
                this.stateManager.setState({ user }, 'checkAuth');
                console.log('✅ User authenticated:', user.name);
            }
        } catch (error) {
            console.log('No authentication found');
        }
    }

    async logout() {
        try {
            await this.cloudAPI.logout();
            this.stateManager.clearSession();
            this.showNotification('Erfolgreich abgemeldet', 'success');
            this.navigateTo('home');
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Fehler beim Abmelden', 'error');
        }
    }

    /**
     * Loading States
     */
    showLoading(message = 'Wird geladen...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const text = overlay.querySelector('p');
            if (text) text.textContent = message;
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
     * State Management (Legacy Compatibility)
     */
    getState() {
        return this.stateManager.getState();
    }

    setState(updates) {
        this.stateManager.setState(updates, 'app');
    }

    getCurrentView() {
        return this.stateManager.get('ui.currentView') || this.currentView;
    }

    // API access for components
    getCloudAPI() {
        return this.cloudAPI;
    }

    getRealtime() {
        return this.realtime;
    }

    // Cleanup method for proper app shutdown
    async cleanup() {
        console.log('🧹 Cleaning up application');
        await this.componentManager.cleanupAll();
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.PiGiQuizApp = new PiGiQuizApp();
    window.app = window.PiGiQuizApp; // Add global reference for compatibility
});

// Export for module use
export default PiGiQuizApp;
