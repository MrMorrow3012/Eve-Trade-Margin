const CACHE = 'haul-margin-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache live ESI market data - always go to network
  if (url.hostname.includes('esi.evetech.net')) return;

  // Network-first for the app shell: always try to fetch the latest version when online,
  // and only fall back to the cached copy if the network request fails (i.e. offline).
  // This is the fix - previously this was cache-first, so an unchanged service-worker.js
  // file meant the browser never had a reason to re-check for a new index.html at all.
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
