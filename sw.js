// ==========================================
// Omniapp Service Worker - v5
// Incluye precacheo de fuentes DM Sans
// ==========================================

const CACHE_NAME = 'omniapp-cache-v5';
const CACHE_STATIC = 'omniapp-static-v5';
const CACHE_CDN = 'omniapp-cdn-v5';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './fonts/DMSans-Regular.ttf',
  './fonts/DMSans-Bold.ttf'
];

const CDN_PRECACHE = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap'
];

const BYPASS_HOSTS = [
  'firebaseio.com',
  'firebasedatabase.app',
  'googleapis.com',
  'firebaseapp.com',
  'gstatic.com',
  'google-analytics.com',
  'googletagmanager.com'
];

const STATIC_CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(cache => 
        cache.addAll(urlsToCache).catch(err => 
          console.warn('⚠️ SW: error precache shell:', err)
        )
      ),
      caches.open(CACHE_CDN).then(cache =>
        Promise.all(
          CDN_PRECACHE.map(url =>
            cache.add(url).catch(err =>
              console.warn(`⚠️ SW: no se pudo precachear ${url}:`, err.message)
            )
          )
        )
      )
    ])
  );
});

self.addEventListener('activate', event => {
  const VALID_CACHES = [CACHE_STATIC, CACHE_CDN, CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !VALID_CACHES.includes(key))
          .map(key => {
            console.log('🧹 SW: eliminando caché viejo:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:'
  ) {
    return;
  }

  if (BYPASS_HOSTS.some(host => url.hostname.includes(host))) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_STATIC).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('./index.html')
          )
        )
    );
    return;
  }

  if (STATIC_CDN_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(response => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_CDN).then(cache => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(response => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_STATIC).then(cache => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
