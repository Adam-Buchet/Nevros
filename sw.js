/* Service worker — Atrocement Autiste (version statique, chemins relatifs) */

const CACHE_PREFIX = 'aa-';
const CORE_CACHE = CACHE_PREFIX + 'core-v6';
const RUNTIME_CACHE = CACHE_PREFIX + 'runtime-v6';

const PRECACHE = [
  './',
  './index.html',
  './login.html',
  './archives.html',
  './defis.html',
  './actualites.html',
  './coffre.html',
  './ludique.html',
  './sondages.html',
  './mentions.html',
  './manifest.json',
  './icons/logo.svg',
  './css/styles.css',
  './css/themes.css',
  './fonts/fonts.css',
  './fonts/font-1.woff2',
  './fonts/font-2.woff2',
  './fonts/font-3.woff2',
  './fonts/font-4.woff2',
  './fonts/font-5.woff2',
  './fonts/font-6.woff2',
  './js/store.js',
  './js/app.js',
  './js/login.js',
  './js/archives.js',
  './js/defis.js',
  './js/actualites.js',
  './js/coffre.js',
  './js/ludique.js',
  './js/sondages.js',
  './js/mosaic.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CORE_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
