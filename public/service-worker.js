// v2: ya no se guardan respuestas de datos ni páginas (antes, sin internet, la app mostraba stock
// viejo como si fuera actual). Al activarse borra la caché v1, que podía tener datos guardados.
const CACHE_NAME = 'pymetory-v2';

const STATIC_ASSETS = [
  '/offline.html',
];

const CACHE_EXTENSIONS = ['css', 'js', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'eot'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin === location.origin) {
    if (CACHE_EXTENSIONS.some((ext) => url.pathname.endsWith('.' + ext))) {
      event.respondWith(cacheFirst(request));
      return;
    }

    if (url.pathname.startsWith('/build/')) {
      event.respondWith(cacheFirst(request));
      return;
    }

    if (url.pathname.startsWith('/storage/')) {
      event.respondWith(cacheFirst(request));
      return;
    }
  }

  // Datos y páginas: siempre del servidor. Sin conexión, una página avisa en vez de mostrar datos viejos.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
