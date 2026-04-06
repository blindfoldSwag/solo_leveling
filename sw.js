const CACHE = 'sl-system-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './push-config.js'
];

function buildNotificationUrl(data = {}) {
  const target = data.target || 'daily_briefing';
  const stat = data.stat ? `&stat=${encodeURIComponent(data.stat)}` : '';
  return `./index.html?notif=${encodeURIComponent(target)}${stat}`;
}

function buildNotificationOptions(payload = {}) {
  const data = payload.data || {};
  const actions = payload.actions || [
    { action: 'open', title: 'Open System' },
    { action: 'dismiss', title: 'Dismiss' }
  ];
  return {
    body: payload.body || 'The System has an update waiting.',
    tag: payload.tag || `sl-${data.target || 'system'}`,
    data,
    actions,
    requireInteraction: !!payload.requireInteraction,
    renotify: true,
    icon: payload.icon || 'icons/icon-192.png',
    badge: payload.badge || 'icons/icon-192.png'
  };
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('fonts.googleapis') || event.request.url.includes('fonts.gstatic')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  if (event.request.url.endsWith('index.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Solo Leveling System';
  event.waitUntil(self.registration.showNotification(title, buildNotificationOptions(payload)));
});

self.addEventListener('notificationclick', event => {
  const action = event.action || 'open';
  if (action === 'dismiss') {
    event.notification.close();
    return;
  }

  const data = event.notification.data || {};
  const targetUrl = buildNotificationUrl(data);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(client => 'focus' in client);
      if (existing) {
        if ('navigate' in existing) existing.navigate(targetUrl);
        existing.postMessage({ type: 'OPEN_NOTIFICATION_TARGET', target: data.target, stat: data.stat || '' });
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
