/**
 * Service Worker for PiGi Quiz Platform
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'pigi-quiz-v2.1.1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/spa.css',
    '/js/app.js',
    '/js/api.js',
    '/js/config.js',
    '/js/pwa.js',
    '/js/realtime.js',
    '/js/components/quiz-admin.js',
    '/js/components/quiz-editor.js',
    '/js/components/live-controller.js',
    '/js/components/participant.js',
    '/js/components/participant-join.js',
    '/js/utils/base-component.js',
    '/js/utils/common.js',
    '/js/utils/index.js',
    '/js/utils/security.js',
    '/js/core/component-manager.js',
    '/js/core/state-manager.js',
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
    // Skip non-GET requests and chrome-extension requests
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available
                if (response) {
                    return response;
                }
                
                // Fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clone the response for caching
                        const responseToCache = networkResponse.clone();

                        // Cache the response for future use
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        // If both cache and network fail, return offline page for documents
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        // For other resources, return a basic error response
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
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
