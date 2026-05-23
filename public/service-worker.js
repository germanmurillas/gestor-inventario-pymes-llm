const CACHE_NAME = 'pymetory-v1';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/dashboard',
  '/login',
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

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    throw err;
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    throw err;
  }
}
