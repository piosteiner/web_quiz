/**
 * Service Worker for PiGi Quiz Platform
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'pigi-quiz-v1.0.1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/spa.css',
    '/js/app.js',
    '/js/cloud-api.js',
    '/js/config.js',
    '/js/pwa.js',
    '/js/components/quiz-admin.js',
    '/js/components/quiz-editor.js',
    '/js/components/live-controller.js',
    '/js/components/participant.js',
    // Add other essential assets
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker cache failed:', error);
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
            .catch(() => {
                // If both cache and network fail, return offline page
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
