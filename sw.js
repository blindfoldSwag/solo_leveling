const CACHE = 'sl-system-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache core assets, ignore font failures (they'll load when online)
      return cache.addAll(['./','./index.html','./manifest.json']).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network first for Google Fonts (online), cache fallback for app shell
  if (e.request.url.includes('fonts.googleapis') || e.request.url.includes('fonts.gstatic')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
