// Keep this worker deliberately network-only. PharmaHub uses authenticated and
// user-specific data, so responses must not be stored in a shared cache.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Do not interfere with mutations, API routes, or third-party requests.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Pass through to the network without caching HTML, assets, or personal data.
  event.respondWith(fetch(request));
});
