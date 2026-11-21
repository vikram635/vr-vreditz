
const CACHE_NAME = 'vreditz-static-v2';

const APP_FILES = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.all(
        APP_FILES.map((file) =>
          cache.add(file).catch(() => {})
        )
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('vreditz-') &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/')
  ) return;

  const isNavigation =
    request.mode === 'navigate' &&
    url.pathname === '/';

  const isStatic =
    ['script', 'style', 'image', 'font'].includes(
      request.destination
    ) ||
    url.pathname === '/manifest.webmanifest';

  if (!isNavigation && !isStatic) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        if (response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        return (
          await cache.match(request) ||
          (isNavigation ? await cache.match('/') : null) ||
          Response.error()
        );
      }
    })()
  );
});
