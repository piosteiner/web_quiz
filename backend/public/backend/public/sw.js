// QuizMaster Service Worker - PWA Offline Support
const CACHE_NAME = 'quizmaster-v1.0.0';
const STATIC_CACHE = 'quizmaster-static-v1.0.0';
const DYNAMIC_CACHE = 'quizmaster-dynamic-v1.0.0';

// Core files to cache for offline functionality
const CORE_FILES = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/admin.css',
  '/css/join.css',
  '/css/live-control.css',
  '/js/main.js',
  '/js/config.js',
  '/js/realtime.js',
  '/js/admin.js',
  '/js/join.js',
  '/js/live-control.js',
  '/js/backend-api-adapter.js',
  '/js/cloud-api.js',
  '/js/live-quiz-manager.js',
  '/html/admin.html',
  '/html/join.html',
  '/html/live-control.html',
  '/manifest.json'
];

// Network-first resources (always try network first)
const NETWORK_FIRST = [
  '/api/',
  '/socket.io/'
];

// Cache-first resources (use cache if available)
const CACHE_FIRST = [
  '/css/',
  '/js/',
  '/icons/',
  '/screenshots/'
];

// Install event - cache core files
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching core files');
        return cache.addAll(CORE_FILES);
      })
      .then(() => {
        console.log('[SW] Core files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache core files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle different caching strategies
  if (isNetworkFirst(request.url)) {
    event.respondWith(networkFirst(request));
  } else if (isCacheFirst(request.url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Network-first strategy (for API calls)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    throw error;
  }
}

// Stale-while-revalidate strategy (for HTML pages)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Helper functions
function isNetworkFirst(url) {
  return NETWORK_FIRST.some(pattern => url.includes(pattern));
}

function isCacheFirst(url) {
  return CACHE_FIRST.some(pattern => url.includes(pattern));
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'quiz-sync') {
    event.waitUntil(syncQuizData());
  }
});

// Sync quiz data when back online
async function syncQuizData() {
  try {
    // Implement quiz data synchronization logic here
    console.log('[SW] Syncing quiz data...');
    
    // Get pending actions from IndexedDB
    // Send to server when online
    // Clear pending actions
    
    console.log('[SW] Quiz data synced successfully');
  } catch (error) {
    console.error('[SW] Failed to sync quiz data:', error);
  }
}

// Push notifications for quiz events
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

console.log('[SW] Service Worker loaded successfully');
