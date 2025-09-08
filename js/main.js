// Main Application Initialization and Theme Management
// Backend Integration
import BackendAPIAdapter from './backend-api-adapter.js';

// Theme Management
class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Set initial theme based on system preference or saved preference
        this.setInitialTheme();
        
        // Add event listeners
        this.addEventListeners();
        
        // Initialize other features
        this.initScrollAnimations();
        this.initSmoothScrolling();
        this.initStatsAnimation();
        
        // Initialize backend integration if cloudAPI is available
        this.initBackendIntegration();
    }

    initBackendIntegration() {
        // Wait for cloudAPI to be available
        if (window.cloudAPI) {
            window.backendAdapter = new BackendAPIAdapter(window.cloudAPI);
            console.log('✅ Backend API Adapter initialized');
        } else {
            // Retry after a short delay
            setTimeout(() => {
                this.initBackendIntegration();
            }, 100);
        }
    }

    setInitialTheme() {
        // Check for saved theme preference or default to system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let theme;
        if (savedTheme) {
            theme = savedTheme;
        } else {
            theme = systemPrefersDark ? 'dark' : 'light';
        }
        
        this.setTheme(theme);
        this.updateThemeToggleText(theme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this.setTheme(newTheme);
        this.updateThemeToggleText(newTheme);
    }

    updateThemeToggleText(theme) {
        const toggleButton = document.getElementById('theme-toggle');
        if (toggleButton) {
            toggleButton.innerHTML = theme === 'dark' 
                ? '☀️ Heller Modus' 
                : '🌙 Dunkler Modus';
        }
    }

    addEventListeners() {
        // Theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only update if user hasn't manually set a preference
            if (!localStorage.getItem('theme')) {
                const theme = e.matches ? 'dark' : 'light';
                this.setTheme(theme);
                this.updateThemeToggleText(theme);
            }
        });
    }

    initSmoothScrolling() {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.feature-card, .step').forEach(element => {
            element.classList.add('fade-in');
            observer.observe(element);
        });
    }

    initStatsAnimation() {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateStats(entry.target);
                    statsObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        const statsSection = document.querySelector('.stats');
        if (statsSection) {
            statsObserver.observe(statsSection);
        }
    }

    animateStats(statsSection) {
        const statNumbers = statsSection.querySelectorAll('.stat-item h3');
        
        statNumbers.forEach(stat => {
            const text = stat.textContent;
            const match = text.match(/(\d+(?:,\d+)*)/);
            
            if (match) {
                const number = parseInt(match[1].replace(/,/g, ''));
                const suffix = text.replace(match[1], '');
                
                this.animateCounter(stat, number, suffix);
            }
        });
    }

    animateCounter(element, target, suffix = '') {
        let current = 0;
        const increment = target / 50;
        const duration = 2000; // 2 seconds
        const stepTime = duration / 50;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            const displayNumber = Math.floor(current).toLocaleString();
            element.textContent = displayNumber + suffix;
        }, stepTime);
    }
}

// Utility Functions
class Utils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
}

// Navbar scroll effect
class NavbarEffects {
    constructor() {
        this.navbar = document.querySelector('header');
        this.init();
    }

    init() {
        if (!this.navbar) return;
        
        const handleScroll = Utils.throttle(() => {
            const scrolled = window.scrollY > 50;
            this.navbar.style.padding = scrolled ? '0.5rem 0' : '1rem 0';
        }, 100);

        window.addEventListener('scroll', handleScroll);
    }
}

// Mobile menu functionality (for future expansion)
class MobileMenu {
    constructor() {
        this.init();
    }

    init() {
        // Add mobile menu button if needed
        this.addMobileMenuButton();
    }

    addMobileMenuButton() {
        const nav = document.querySelector('nav');
        if (!nav) return;

        // Only add mobile menu on small screens
        if (window.innerWidth <= 768) {
            const mobileMenuBtn = document.createElement('button');
            mobileMenuBtn.innerHTML = '☰';
            mobileMenuBtn.className = 'mobile-menu-btn';
            mobileMenuBtn.style.cssText = `
                display: none;
                background: none;
                border: none;
                font-size: 1.5rem;
                color: var(--text-primary);
                cursor: pointer;
                padding: 0.5rem;
            `;

            // Show button on mobile
            if (window.innerWidth <= 480) {
                mobileMenuBtn.style.display = 'block';
                nav.appendChild(mobileMenuBtn);
            }
        }
    }
}

// Form validation (for future contact forms)
class FormValidator {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validateRequired(value) {
        return value && value.trim().length > 0;
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme manager
    new ThemeManager();
    
    // Initialize navbar effects
    new NavbarEffects();
    
    // Initialize mobile menu
    new MobileMenu();
    
    // Add loading complete class to body
    document.body.classList.add('loaded');
});

// Handle window resize
window.addEventListener('resize', Utils.debounce(() => {
    // Reinitialize mobile menu if needed
    if (window.innerWidth <= 480) {
        new MobileMenu();
    }
}, 250));

// Admin Modal Management
class AdminModal {
    constructor() {
        this.modal = document.getElementById('admin-modal');
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Open modal triggers
        const adminLinks = ['admin-link', 'admin-hero-link'];
        adminLinks.forEach(id => {
            const link = document.getElementById(id);
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal();
                });
            }
        });

        // Close modal
        const closeBtn = document.getElementById('close-admin-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Close on overlay click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-tab')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Form submissions
        const loginForm = document.getElementById('modal-login-form');
        const registerForm = document.getElementById('modal-register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display !== 'none') {
                this.closeModal();
            }
        });
    }

    openModal() {
        if (this.currentUser) {
            // User is already logged in, redirect to admin panel
            window.location.href = 'html/admin.html';
            return;
        }
        
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.modal.querySelector('input[type="text"]');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this.clearMessages();
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update forms
        document.querySelectorAll('.auth-form').forEach(f => {
            f.classList.remove('active');
        });
        document.getElementById(`modal-${tab}-form`).classList.add('active');

        this.clearMessages();
    }

    async handleLogin() {
        const username = document.getElementById('modal-login-username').value;
        const password = document.getElementById('modal-login-password').value;
        const remember = document.getElementById('modal-remember-me').checked;

        try {
            this.showMessage('login', 'Anmeldung läuft...', 'info');
            
            // Simulate API call (replace with real authentication)
            const response = await this.authenticateUser(username, password);
            
            if (response.success) {
                this.currentUser = response.user;
                
                if (remember) {
                    localStorage.setItem('quiz_auth_token', response.token);
                    localStorage.setItem('quiz_user_data', JSON.stringify(response.user));
                }
                
                this.showMessage('login', 'Anmeldung erfolgreich! Weiterleitung...', 'success');
                
                setTimeout(() => {
                    this.closeModal();
                    window.location.href = 'html/admin.html';
                }, 1500);
            } else {
                this.showMessage('login', response.message || 'Anmeldung fehlgeschlagen', 'error');
            }
        } catch (error) {
            this.showMessage('login', 'Verbindungsfehler. Bitte versuchen Sie es erneut.', 'error');
        }
    }

    async handleRegister() {
        const username = document.getElementById('modal-register-username').value;
        const email = document.getElementById('modal-register-email').value;
        const password = document.getElementById('modal-register-password').value;
        const confirmPassword = document.getElementById('modal-register-confirm').value;

        // Validation
        if (password !== confirmPassword) {
            this.showMessage('register', 'Passwörter stimmen nicht überein', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('register', 'Passwort muss mindestens 6 Zeichen lang sein', 'error');
            return;
        }

        try {
            this.showMessage('register', 'Registrierung läuft...', 'info');
            
            // Simulate API call (replace with real registration)
            const response = await this.registerUser(username, email, password);
            
            if (response.success) {
                this.showMessage('register', 'Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
                
                setTimeout(() => {
                    this.switchTab('login');
                    document.getElementById('modal-login-username').value = username;
                }, 2000);
            } else {
                this.showMessage('register', response.message || 'Registrierung fehlgeschlagen', 'error');
            }
        } catch (error) {
            this.showMessage('register', 'Verbindungsfehler. Bitte versuchen Sie es erneut.', 'error');
        }
    }

    async authenticateUser(username, password) {
        // TODO: Replace with real API call to your backend
        return new Promise((resolve) => {
            setTimeout(() => {
                if (username === 'admin' && password === 'admin') {
                    resolve({
                        success: true,
                        user: { username: 'admin', displayName: 'Administrator' },
                        token: 'demo-token-' + Date.now()
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Ungültige Anmeldedaten'
                    });
                }
            }, 1000);
        });
    }

    async registerUser(username, email, password) {
        // TODO: Replace with real API call to your backend
        return new Promise((resolve) => {
            setTimeout(() => {
                if (username.length >= 3) {
                    resolve({
                        success: true,
                        message: 'Benutzer erfolgreich erstellt'
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Benutzername zu kurz'
                    });
                }
            }, 1000);
        });
    }

    checkAuthStatus() {
        const token = localStorage.getItem('quiz_auth_token');
        const userData = localStorage.getItem('quiz_user_data');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
            } catch (error) {
                localStorage.removeItem('quiz_auth_token');
                localStorage.removeItem('quiz_user_data');
            }
        }
    }

    showMessage(type, message, messageType) {
        const messageElement = document.getElementById(`modal-${type}-message`);
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `auth-message ${messageType}`;
            messageElement.style.display = 'block';
        }
    }

    clearMessages() {
        ['login', 'register'].forEach(type => {
            const messageElement = document.getElementById(`modal-${type}-message`);
            if (messageElement) {
                messageElement.style.display = 'none';
                messageElement.textContent = '';
                messageElement.className = 'auth-message';
            }
        });
    }
}

// Initialize Admin Modal
new AdminModal();

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ThemeManager,
        Utils,
        NavbarEffects,
        MobileMenu,
        FormValidator,
        AdminModal
    };
}
