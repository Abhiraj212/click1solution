/**
 * Click1Solutions - Service Worker
 * ================================
 * PWA functionality with secure caching
 */

const CACHE_NAME = 'click1solutions-v3';
const STATIC_CACHE = 'click1solutions-static-v3';

// Public pages to cache (DO NOT cache admin pages)
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/services.html',
    '/construction.html',
    '/food.html',
    '/travel.html',
    '/gst.html',
    '/marketing.html',
    '/it.html',
    '/staff-register.html',
    '/cancel-request.html',
    '/style.css',
    '/script.js',
    '/security.js',
    '/manifest.json'
];

// Admin pages - explicitly excluded from caching
const ADMIN_PAGES = [
    '/admin-login.html',
    '/admin-dashboard.html',
    '/admin.js'
];

// ==================== INSTALL EVENT ====================
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[ServiceWorker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((error) => {
                console.log('[ServiceWorker] Cache failed:', error);
            })
    );
    
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// ==================== ACTIVATE EVENT ====================
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches
                    if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Claim clients immediately
    event.waitUntil(self.clients.claim());
});

// ==================== FETCH EVENT ====================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip admin pages - NEVER cache admin pages
    if (ADMIN_PAGES.some(page => url.pathname.includes(page))) {
        console.log('[ServiceWorker] Skipping admin page:', url.pathname);
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isPageRequest(request)) {
        event.respondWith(handlePageRequest(request));
    }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if request is for a static asset
 * @param {Request} request - Fetch request
 * @returns {boolean}
 */
function isStaticAsset(request) {
    const staticExtensions = ['.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
    return staticExtensions.some(ext => request.url.endsWith(ext));
}

/**
 * Check if request is for a page
 * @param {Request} request - Fetch request
 * @returns {boolean}
 */
function isPageRequest(request) {
    return request.mode === 'navigate' || request.headers.get('accept').includes('text/html');
}

/**
 * Handle static asset requests - Cache First strategy
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>}
 */
async function handleStaticAsset(request) {
    const cached = await caches.match(request);
    
    if (cached) {
        // Return cached version and update in background
        updateCache(request);
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('[ServiceWorker] Fetch failed:', error);
        // Return offline fallback if available
        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

/**
 * Handle page requests - Network First strategy
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>}
 */
async function handlePageRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Update cache with fresh content
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[ServiceWorker] Network failed, trying cache:', error);
        
        // Fall back to cache
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        
        // Return offline page
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline - Click1Solutions</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #f1f5f9;
                        text-align: center;
                        padding: 20px;
                    }
                    .container {
                        max-width: 400px;
                    }
                    .icon {
                        width: 80px;
                        height: 80px;
                        background: #1a5fb4;
                        border-radius: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 24px;
                        color: white;
                        font-size: 40px;
                        font-weight: bold;
                    }
                    h1 {
                        color: #1a1a2e;
                        margin-bottom: 12px;
                    }
                    p {
                        color: #4a4a5a;
                        line-height: 1.6;
                        margin-bottom: 24px;
                    }
                    button {
                        background: #1a5fb4;
                        color: white;
                        border: none;
                        padding: 14px 32px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                    }
                    button:hover {
                        background: #104a8e;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">C1</div>
                    <h1>You're Offline</h1>
                    <p>Please check your internet connection and try again. Some features may not be available offline.</p>
                    <button onclick="window.location.reload()">Try Again</button>
                </div>
            </body>
            </html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

/**
 * Update cache in background
 * @param {Request} request - Fetch request
 */
async function updateCache(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response);
        }
    } catch (error) {
        console.log('[ServiceWorker] Background update failed:', error);
    }
}

// ==================== MESSAGE HANDLER ====================
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data === 'clearAdminCache') {
        // Clear sensitive admin-related cache on logout
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                caches.open(cacheName).then((cache) => {
                    cache.keys().then((requests) => {
                        requests.forEach((request) => {
                            if (ADMIN_PAGES.some(page => request.url.includes(page))) {
                                cache.delete(request);
                            }
                        });
                    });
                });
            });
        });
    }
});

// ==================== BACKGROUND SYNC ====================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-requests') {
        event.waitUntil(syncPendingRequests());
    }
});

/**
 * Sync pending requests when back online
 */
async function syncPendingRequests() {
    // This would handle any queued form submissions
    console.log('[ServiceWorker] Background sync executed');
}

// ==================== PUSH NOTIFICATIONS ====================
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                tag: data.tag,
                requireInteraction: data.requireInteraction || false,
                actions: data.actions || []
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});

// ==================== PERIODIC SYNC ====================
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-check') {
        event.waitUntil(checkForUpdates());
    }
});

/**
 * Check for app updates
 */
async function checkForUpdates() {
    console.log('[ServiceWorker] Checking for updates');
    // This would check for new content and notify the app
}

console.log('[ServiceWorker] Loaded');
