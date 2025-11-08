const PUSH_CACHE = "diet-pwa-cache-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== PUSH_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const title = payload.title || "Yeni Bildirim";
  const options = {
    body: payload.body,
    icon: payload.icon || "/image.png",
    badge: payload.badge || "/image.png",
    data: {
      url: payload.url,
      ...payload.data,
    },
    vibrate: [100, 50, 100],
    actions: payload.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const existing = allClients.find((client) => {
        return "url" in client && client.url.includes(destination);
      });

      if (existing) {
        existing.focus();
      } else if (self.clients.openWindow) {
        await self.clients.openWindow(destination);
      }
    })()
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const registration = await self.registration;
      await registration.pushManager.getSubscription();
    })()
  );
});
// Simple Service Worker for PWA
// This can be extended later for offline support

const CACHE_NAME = 'diet-app-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // For now, just pass through - can be extended for offline support later
  event.respondWith(fetch(event.request));
});

