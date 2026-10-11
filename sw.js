// ==========================================
// Omniapp Service Worker - v2
// ==========================================

const CACHE_NAME = 'omniapp-cache-v2';
const CACHE_STATIC = 'omniapp-static-v2';

// Recursos del "shell" que siempre deben estar disponibles offline
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Dominios que NUNCA deben cachearse (rompen la app o son dinámicos)
const BYPASS_HOSTS = [
  'firebaseio.com',
  'firebasedatabase.app',
  'googleapis.com',      // Firebase Auth, FCM
  'firebaseapp.com',
  'gstatic.com',         // SDKs de Firebase (muy dinámicos)
  'google-analytics.com',
  'googletagmanager.com'
];

// CDNs estáticos que SÍ queremos cachear (mejoran offline)
const STATIC_CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com',       // Font Awesome
  'fonts.googleapis.com',       // DM Sans
  'fonts.gstatic.com'           // Archivos de fuentes
];

// ------------------------------------------
// INSTALL: precachea el shell y activa ya
// ------------------------------------------
self.addEventListener('install', event => {
  self.skipWaiting(); // No esperar a que se cierren las pestañas
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('⚠️ SW: error al precachear shell:', err);
      });
    })
  );
});

// ------------------------------------------
// ACTIVATE: limpia cachés viejos
// ------------------------------------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_STATIC && key !== CACHE_NAME)
          .map(key => {
            console.log('🧹 SW: eliminando caché viejo:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // Toma control inmediato
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
    return; // Dejar pasar la petición normal (sin cachear)
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

  // 📦 4. CDNs estáticos conocidos → Cache-first + update en background
  if (STATIC_CDN_HOSTS.some(host => url.hostname.includes(host))) {
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

  // 🌍 6. Cualquier otra cosa → solo red
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ------------------------------------------
// MESSAGE: permite forzar actualización desde la app
// ------------------------------------------
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
