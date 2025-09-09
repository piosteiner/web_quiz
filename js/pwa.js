/**
 * Progressive Web App (PWA) Service Worker Registration
 * Handles offline functionality and app installation
 */

// Check if service workers are supported
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Register the service worker
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            console.log('✅ Service Worker registered successfully:', registration.scope);
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 New content available, please refresh.');
                            // You could show a notification to the user here
                        }
                    });
                }
            });
            
        } catch (error) {
            console.log('❌ Service Worker registration failed:', error);
        }
    });
}

// Handle app installation prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('💾 App installation prompt available');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button if you have one
    const installButton = document.getElementById('install-button');
    if (installButton) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to install prompt: ${outcome}`);
                deferredPrompt = null;
                installButton.style.display = 'none';
            }
        });
    }
});

// Handle successful installation
window.addEventListener('appinstalled', (e) => {
    console.log('✅ Quiz App installed successfully');
    deferredPrompt = null;
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('🌐 Back online');
    document.body.classList.remove('offline');
    document.body.classList.add('online');
});

window.addEventListener('offline', () => {
    console.log('📱 Gone offline');
    document.body.classList.remove('online');
    document.body.classList.add('offline');
});

// Initialize online/offline status
if (navigator.onLine) {
    document.body.classList.add('online');
} else {
    document.body.classList.add('offline');
}

export default {
    isOnline: () => navigator.onLine,
    installApp: () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            return deferredPrompt.userChoice;
        }
        return Promise.resolve({ outcome: 'dismissed' });
    }
};
