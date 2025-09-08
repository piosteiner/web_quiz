// QuizMaster - Main JavaScript File

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
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        this.updateThemeToggleText(newTheme);
    }

    updateThemeToggleText(theme) {
        const toggleButtons = document.querySelectorAll('#theme-toggle, #footer-theme-toggle');
        toggleButtons.forEach(button => {
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
        });
    }

    addEventListeners() {
        // Theme toggle buttons
        const themeToggles = document.querySelectorAll('#theme-toggle, #footer-theme-toggle');
        themeToggles.forEach(toggle => {
            if (toggle) {
                toggle.addEventListener('click', () => this.toggleTheme());
            }
        });

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
        // Animate elements on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeIn 0.6s ease-out';
                    
                    // Special handling for stats
                    if (entry.target.classList.contains('stats')) {
                        this.animateStats(entry.target);
                    }
                }
            });
        }, observerOptions);

        // Observe all sections
        document.querySelectorAll('section').forEach(section => {
            observer.observe(section);
        });
    }

    initStatsAnimation() {
        // This will be triggered when stats section comes into view
        // Implementation in animateStats method
    }

    animateStats(statsSection) {
        const statNumbers = statsSection.querySelectorAll('.stat-number');
        
        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            const suffix = stat.textContent.includes('%') ? '%' : '';
            
            this.animateCounter(stat, target, suffix);
        });
    }

    animateCounter(element, target, suffix = '') {
        let current = 0;
        const increment = target / 100;
        const duration = 2000; // 2 seconds
        const stepTime = duration / 100;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current) + suffix;
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

    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    box-shadow: var(--shadow-lg);
                    padding: 1rem;
                    max-width: 400px;
                    z-index: 1000;
                    animation: slideIn 0.3s ease-out;
                }
                
                .notification-success { border-left: 4px solid var(--success); }
                .notification-error { border-left: 4px solid var(--error); }
                .notification-info { border-left: 4px solid var(--primary); }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    margin-left: auto;
                    padding: 0.25rem;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }
}

// Navbar scroll effect
class NavbarEffects {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.init();
    }

    init() {
        if (!this.navbar) return;
        
        const handleScroll = Utils.throttle(() => {
            const scrolled = window.scrollY > 50;
            this.navbar.style.padding = scrolled ? '0.5rem 0' : '1rem 0';
            this.navbar.style.backdropFilter = scrolled ? 'blur(10px)' : 'none';
            this.navbar.style.backgroundColor = scrolled ? 
                'rgba(var(--background-rgb), 0.9)' : 'var(--background)';
        }, 100);

        window.addEventListener('scroll', handleScroll);
    }
}

// Mobile menu functionality
class MobileMenu {
    constructor() {
        this.init();
    }

    init() {
        // Add mobile menu button if screen is small
        if (window.innerWidth <= 768) {
            this.createMobileMenu();
        }
    }

    createMobileMenu() {
        const navbar = document.querySelector('.navbar .container');
        if (!navbar || document.querySelector('.mobile-menu-toggle')) return;

        const menuToggle = document.createElement('button');
        menuToggle.className = 'mobile-menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.style.cssText = `
            display: none;
            background: none;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 0.5rem;
            color: var(--text-primary);
            cursor: pointer;
        `;

        // Add styles for mobile
        const styles = document.createElement('style');
        styles.textContent = `
            @media (max-width: 768px) {
                .mobile-menu-toggle { display: block !important; }
                .nav-links { 
                    display: none; 
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--background);
                    border-top: 1px solid var(--border);
                    flex-direction: column;
                    padding: 1rem;
                    gap: 1rem;
                }
                .nav-links.mobile-open { display: flex; }
            }
        `;
        document.head.appendChild(styles);

        navbar.appendChild(menuToggle);

        menuToggle.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            navLinks.classList.toggle('mobile-open');
            
            const icon = menuToggle.querySelector('i');
            icon.className = navLinks.classList.contains('mobile-open') ? 
                'fas fa-times' : 'fas fa-bars';
        });
    }
}

// Form validation
class FormValidator {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validateRequired(value) {
        return value && value.trim().length > 0;
    }

    static validateMinLength(value, minLength) {
        return value && value.length >= minLength;
    }

    static validateForm(formElement, rules) {
        const errors = [];
        
        Object.keys(rules).forEach(fieldName => {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            const value = field.value;
            const fieldRules = rules[fieldName];

            fieldRules.forEach(rule => {
                if (rule.type === 'required' && !this.validateRequired(value)) {
                    errors.push({ field: fieldName, message: rule.message });
                }
                if (rule.type === 'email' && value && !this.validateEmail(value)) {
                    errors.push({ field: fieldName, message: rule.message });
                }
                if (rule.type === 'minLength' && value && !this.validateMinLength(value, rule.value)) {
                    errors.push({ field: fieldName, message: rule.message });
                }
            });
        });

        return errors;
    }
}

// Quiz preview functionality
class QuizPreview {
    constructor() {
        this.init();
    }

    init() {
        this.animateQuizPreview();
    }

    animateQuizPreview() {
        const answers = document.querySelectorAll('.hero .answer');
        if (answers.length === 0) return;

        let currentIndex = 0;
        
        const highlightAnswer = () => {
            // Remove previous highlights
            answers.forEach(answer => {
                answer.style.backgroundColor = 'var(--background)';
                answer.style.borderColor = 'var(--border)';
                answer.style.transform = 'scale(1)';
            });

            // Highlight current answer
            if (answers[currentIndex]) {
                answers[currentIndex].style.backgroundColor = 'var(--background-secondary)';
                answers[currentIndex].style.borderColor = 'var(--primary)';
                answers[currentIndex].style.transform = 'scale(1.02)';
                answers[currentIndex].style.transition = 'all 0.3s ease';
            }

            currentIndex = (currentIndex + 1) % answers.length;
        };

        // Start animation after page load
        setTimeout(() => {
            setInterval(highlightAnswer, 2000);
        }, 1000);
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
    
    // Initialize quiz preview
    new QuizPreview();
    
    // Add loading complete class to body
    document.body.classList.add('loaded');
    
    // Show welcome message
    setTimeout(() => {
        Utils.showNotification('Willkommen bei QuizMaster! 🧠', 'success', 5000);
    }, 1000);
});

// Handle window resize
window.addEventListener('resize', Utils.debounce(() => {
    // Reinitialize mobile menu if needed
    if (window.innerWidth <= 768) {
        new MobileMenu();
    }
}, 250));

// Service Worker registration (for PWA functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ThemeManager,
        Utils,
        NavbarEffects,
        MobileMenu,
        FormValidator,
        QuizPreview
    };
}
