// Service worker for Currency Converter PWA
// Caches the app shell so it loads (and shows last-known UI) even offline.
// Note: live exchange rates still need internet — this only makes the app itself installable/offline-capable.

const CACHE_NAME = 'currency-converter-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - App shell files (HTML/CSS/JS/icons): cache-first, so the app opens instantly
// - Everything else (like the exchange rate API): network-first, falling back to cache if offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const isAppShellRequest = APP_SHELL.some((path) => request.url.endsWith(path.replace('./', '')));

  if (isAppShellRequest) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  } else {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a copy of successful API responses for offline fallback
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
