 
// Firebase Cloud Messaging service worker (Web Push).
// Deve ficar em /firebase-messaging-sw.js (raiz do site).

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// __FIREBASE_CONFIG__ é injetado via query string quando o SW é registrado,
// para não precisar de build step. Ex.: /firebase-messaging-sw.js?p=<base64>
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function getConfig() {
  const url = new URL(self.location.href);
  const p = url.searchParams.get("p");
  if (!p) return null;
  try { return JSON.parse(atob(p)); } catch { return null; }
}

const cfg = getConfig();
if (cfg && firebase.apps.length === 0) {
  firebase.initializeApp(cfg);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notif = (payload.notification || payload.data || {});
    const title = notif.title || payload.data?.title || "Vacatio";
    const options = {
      body: notif.body || payload.data?.body || "",
      icon: notif.icon || payload.data?.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { ...(payload.data || {}), url: payload.data?.url || (payload.fcmOptions && payload.fcmOptions.link) },
    };
    self.registration.showNotification(title, options);

    // delivered
    const cid = payload.data?.campaign_id;
    if (cid && cfg.trackUrl) {
      fetch(cfg.trackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: cfg.anonKey },
        body: JSON.stringify({ campaign_id: cid, event_type: "delivered" }),
      }).catch(() => {});
    }
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "/";
  const cid = data.campaign_id;

  event.waitUntil((async () => {
    if (cid && cfg?.trackUrl) {
      try {
        await fetch(cfg.trackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: cfg.anonKey },
          body: JSON.stringify({ campaign_id: cid, event_type: "opened" }),
        });
      } catch {}
    }
    const target = new URL(url, self.location.origin);
    if (cid) target.searchParams.set("_pc", cid);
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if ("focus" in c) { c.navigate(target.href); return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target.href);
  })());
});
