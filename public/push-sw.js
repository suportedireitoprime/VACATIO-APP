/* Vacatio — Web Push service worker (VAPID). Separado do firebase-messaging-sw.js */
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: 'Vacatio', body: event.data ? event.data.text() : '' }; }
  const title = payload.title || 'Vacatio';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    image: payload.image,
    tag: payload.tag || 'vacatio-lembrete',
    renotify: true,
    data: { url: payload.url || '/', ...(payload.data || {}) },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientsArr) {
      if ('focus' in c) { try { c.navigate(url); } catch {} return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
