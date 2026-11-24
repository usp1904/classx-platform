const CACHE = 'classx-v1';
const ASSETS = [
  './',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cross-origin requests (fonts, unpkg, YouTube) must not go through the
  // service worker: a rejected fetch would surface as a console error.
  if (url.origin !== self.location.origin) return;

  // API calls: try network, fall back to cache; never cache POST/mutations.
  if (url.pathname.includes('/api/')) {
    if (request.method !== 'GET') return;
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || new Response(JSON.stringify({ ok: false, error: 'offline' }), { headers: { 'Content-Type': 'application/json' } }))),
    );
    return;
  }

  // Static assets: cache-first, then network with a safe offline fallback.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => new Response('', { status: 504 }))),
  );
});
