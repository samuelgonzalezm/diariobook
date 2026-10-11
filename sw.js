// ==========================================
// Omniapp Service Worker - v3
// Con precacheo de CDNs externos
// ==========================================

const CACHE_NAME = 'omniapp-cache-v3';
const CACHE_STATIC = 'omniapp-static-v3';
const CACHE_CDN = 'omniapp-cdn-v3';

// Recursos del "shell" que siempre deben estar disponibles offline
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// CDNs externos que queremos precachear (una sola vez)
// Estos son recursos ESTABLES que no cambian seguido
const CDN_PRECACHE = [
  // Font Awesome (iconos)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  
  // Google Fonts (DM Sans)
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap'
];

// Dominios que NUNCA deben cachearse (rompen la app o son dinámicos)
const BYPASS_HOSTS = [
  'firebaseio.com',
  'firebasedatabase.app',
  'googleapis.com',
  'firebaseapp.com',
  'gstatic.com',
  'google-analytics.com',
  'googletagmanager.com'
];

// CDNs estáticos que SÍ queremos cachear dinámicamente
const STATIC_CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// ------------------------------------------
// INSTALL: precachea shell + CDNs críticos
// ------------------------------------------
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      // Shell de la app
      caches.open(CACHE_STATIC).then(cache => 
        cache.addAll(urlsToCache).catch(err => 
          console.warn('⚠️ SW: error precache shell:', err)
        )
      ),
      // CDNs críticos
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

// ------------------------------------------
// ACTIVATE: limpia cachés viejos
// ------------------------------------------
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

// ------------------------------------------
// FETCH: estrategia según tipo de recurso
// ------------------------------------------
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // ❌ 1. Ignorar métodos no-GET y esquemas raros
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:'
  ) {
    return;
  }

  // ❌ 2. Bypass total para Firebase y APIs dinámicas
  if (BYPASS_HOSTS.some(host => url.hostname.includes(host))) {
    return;
  }

  // 🌐 3. Navegación HTML → Network-first con fallback a caché
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

  // 🎨 4. CDNs estáticos → Cache-first + update en background
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

  // 🏠 5. Mismo origen (tus archivos) → Cache-first con update
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

  // 🌍 6. Cualquier otra cosa → solo red con fallback
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ------------------------------------------
// MESSAGE: permite forzar actualización
// ------------------------------------------
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
