const CACHE_NAME = 'techfocal-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event - cache the static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - cache-first for static assets, network-first/network-only for APIs
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

  // Exclude API requests, non-GETs, hot updates, and Vite development requests
  const isBypass = 
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api') || 
    requestUrl.pathname.includes('hot-update') ||
    requestUrl.pathname.startsWith('/@') || 
    requestUrl.pathname.includes('/node_modules/') || 
    requestUrl.search.includes('import') || 
    requestUrl.search.includes('t=');

  if (isBypass) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Handle other static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse && !isDev) {
        // Fetch in the background to update the cache (stale-while-revalidate) in production
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network errors for background fetch */});
        
        return cachedResponse;
      }

      // Fallback to network
      return fetch(event.request).then((networkResponse) => {
        // Cache dynamic assets if they are successful GET requests in production
        if (
          !isDev &&
          networkResponse.status === 200 &&
          (requestUrl.origin === self.location.origin) &&
          (requestUrl.pathname.startsWith('/assets/') || ASSETS_TO_CACHE.includes(requestUrl.pathname))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

