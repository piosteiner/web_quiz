// Progressive Web App (PWA) Module for QuizMaster
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isStandalone = false;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing PWA features...');
        
        // Check if app is running in standalone mode
        this.checkStandaloneMode();
        
        // Register service worker
        await this.registerServiceWorker();
        
        // Set up install prompt handling
        this.setupInstallPrompt();
        
        // Set up PWA UI enhancements
        this.setupPWAUI();
        
        // Set up offline detection
        this.setupOfflineDetection();
        
        console.log('✅ PWA features initialized');
    }

    // Check if app is running as PWA
    checkStandaloneMode() {
        this.isStandalone = 
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');
            
        if (this.isStandalone) {
            document.body.classList.add('pwa-standalone');
            console.log('📱 Running as PWA');
        }
    }

    // Register service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Service Worker update found');
                    this.showUpdateAvailable();
                });
                
                return registration;
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
    }

    // Set up install prompt
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log('📱 Install prompt available');
            event.preventDefault();
            this.deferredPrompt = event;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA installed successfully');
            this.hideInstallButton();
            this.showInstallSuccess();
        });
    }

    // Show install button
    showInstallButton() {
        let installButton = document.getElementById('pwa-install-btn');
        
        if (!installButton) {
            installButton = this.createInstallButton();
            document.body.appendChild(installButton);
        }
        
        installButton.style.display = 'block';
        installButton.addEventListener('click', () => this.promptInstall());
    }

    // Create install button
    createInstallButton() {
        const button = document.createElement('button');
        button.id = 'pwa-install-btn';
        button.className = 'pwa-install-button';
        button.innerHTML = `
            <i class="fas fa-download"></i>
            <span>App installieren</span>
        `;
        
        // Add styles
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #6c5ce7, #a29bfe);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 20px rgba(108, 92, 231, 0.3);
            cursor: pointer;
            display: none;
            z-index: 1000;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        `;
        
        return button;
    }

    // Prompt user to install
    async promptInstall() {
        if (!this.deferredPrompt) return;
        
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        console.log(`👤 User choice: ${outcome}`);
        this.deferredPrompt = null;
        this.hideInstallButton();
    }

    // Hide install button
    hideInstallButton() {
        const installButton = document.getElementById('pwa-install-btn');
        if (installButton) {
            installButton.style.display = 'none';
        }
    }

    // Show install success notification
    showInstallSuccess() {
        this.showNotification('🎉 App erfolgreich installiert!', 'success');
    }

    // Set up PWA UI enhancements
    setupPWAUI() {
        // Add PWA-specific styles
        this.addPWAStyles();
        
        // Enhance navigation for PWA
        this.enhanceNavigation();
        
        // Add app-like gestures
        this.setupGestures();
    }

    // Add PWA-specific styles
    addPWAStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .pwa-standalone {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
            }
            
            .pwa-install-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 25px rgba(108, 92, 231, 0.4);
            }
            
            .offline-indicator {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff6b6b;
                color: white;
                text-align: center;
                padding: 8px;
                font-size: 14px;
                z-index: 10000;
                transform: translateY(-100%);
                transition: transform 0.3s ease;
            }
            
            .offline-indicator.show {
                transform: translateY(0);
            }
            
            .pwa-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 300px;
            }
            
            .pwa-notification.show {
                transform: translateX(0);
            }
            
            .pwa-notification.success {
                border-left: 4px solid #00b894;
            }
            
            .pwa-notification.error {
                border-left: 4px solid #e17055;
            }
        `;
        document.head.appendChild(style);
    }

    // Enhance navigation for PWA
    enhanceNavigation() {
        // Add back button for standalone mode
        if (this.isStandalone) {
            this.addBackButton();
        }
        
        // Prevent default pull-to-refresh
        document.body.style.overscrollBehavior = 'contain';
    }

    // Add back button for navigation
    addBackButton() {
        const header = document.querySelector('header');
        if (header && window.history.length > 1) {
            const backButton = document.createElement('button');
            backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
            backButton.className = 'pwa-back-button';
            backButton.style.cssText = `
                position: absolute;
                left: 16px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: inherit;
                font-size: 18px;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: background 0.2s ease;
            `;
            
            backButton.addEventListener('click', () => window.history.back());
            header.style.position = 'relative';
            header.appendChild(backButton);
        }
    }

    // Set up touch gestures
    setupGestures() {
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Swipe right to go back (if in standalone mode)
            if (this.isStandalone && deltaX > 100 && Math.abs(deltaY) < 50) {
                if (window.history.length > 1) {
                    window.history.back();
                }
            }
            
            startX = 0;
            startY = 0;
        });
    }

    // Set up offline detection
    setupOfflineDetection() {
        const offlineIndicator = this.createOfflineIndicator();
        document.body.appendChild(offlineIndicator);
        
        window.addEventListener('online', () => {
            offlineIndicator.classList.remove('show');
            this.showNotification('🌐 Verbindung wiederhergestellt', 'success');
        });
        
        window.addEventListener('offline', () => {
            offlineIndicator.classList.add('show');
            this.showNotification('📱 Offline-Modus aktiviert', 'error');
        });
    }

    // Create offline indicator
    createOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'offline-indicator';
        indicator.textContent = '📱 Sie sind offline - Einige Funktionen sind möglicherweise nicht verfügbar';
        return indicator;
    }

    // Show update available notification
    showUpdateAvailable() {
        const notification = document.createElement('div');
        notification.className = 'pwa-notification';
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">
                🔄 Update verfügbar
            </div>
            <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
                Eine neue Version der App ist verfügbar.
            </div>
            <button onclick="window.location.reload()" style="
                background: #6c5ce7;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            ">
                Jetzt aktualisieren
            </button>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 10000);
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `pwa-notification ${type}`;
        notification.innerHTML = `
            <div style="font-weight: 600;">
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Get app info
    getAppInfo() {
        return {
            isStandalone: this.isStandalone,
            isOnline: navigator.onLine,
            serviceWorkerSupported: 'serviceWorker' in navigator,
            installPromptAvailable: !!this.deferredPrompt
        };
    }
}

// Initialize PWA when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pwaManager = new PWAManager();
    });
} else {
    window.pwaManager = new PWAManager();
}

export default PWAManager;
