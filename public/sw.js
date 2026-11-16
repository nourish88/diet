const SW_VERSION = "diet-pwa-v8";
const PUSH_CACHE = `${SW_VERSION}-static`;
const BLOB_CACHE = "diet-blob-v2";
const SHELL_CACHE = `${SW_VERSION}-shell`;

// Never precache authenticated pages: cached HTML can retain old bundles and
// show another account's shell after logout. Only a public offline page is safe.
const APP_SHELL = [
  "/offline.html",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  console.log(`[ServiceWorker] Installing ${SW_VERSION}`);
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE);
        await cache.addAll(APP_SHELL.map((p) => new Request(p, { cache: "reload" })));
      } catch (err) {
        console.warn("[ServiceWorker] App shell precache failed:", err);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  console.log(`[ServiceWorker] Activating ${SW_VERSION}`);
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const currentCaches = new Set([PUSH_CACHE, BLOB_CACHE, SHELL_CACHE]);
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("diet-") && !currentCaches.has(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Cache public meal photos from Vercel Blob (cross-origin)
  if (url.hostname.endsWith(".blob.vercel-storage.com")) {
    event.respondWith(blobCacheFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // Authenticated API responses contain private and rapidly changing data.
  // Let the browser fetch them directly so the PWA never serves stale health
  // or conversation data after a short network timeout.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  if (isCacheFirstPath(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    // Every push must produce a visible notification, even for invalid JSON.
    payload = { body: event.data?.text() || "Yeni bir bildiriminiz var." };
  }
  if (typeof payload !== "object" || payload === null) payload = {};
  const title = payload.title || "Yeni Bildirim";
  const options = {
    body: payload.body,
    icon: payload.icon || "/icon-192x192.png",
    badge: payload.badge || "/icon-192x192.png",
    data: {
      url: payload.url,
      ...payload.data,
    },
    vibrate: [100, 50, 100],
    actions: payload.actions || [],
    tag: payload.tag || undefined, // Tag for replacing notifications
    requireInteraction: payload.requireInteraction || false, // Auto-dismiss after a few seconds
  };

  // Acknowledge delivery so the server knows the device actually received it,
  // not just that FCM accepted the push. Acknowledge only after displaying
  // the notification; an acknowledgement failure must not prevent display.
  const ackLogId = payload.data?.logId;
  const broadcastRecipientId = payload.data?.broadcastRecipientId;
  const acknowledge = () =>
    typeof ackLogId === "number" || typeof broadcastRecipientId === "number"
      ? fetch("/api/push/ack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(typeof ackLogId === "number" ? { logId: ackLogId } : {}),
            ...(typeof broadcastRecipientId === "number" ? { broadcastRecipientId } : {}),
          }),
          keepalive: true,
        }).catch(() => undefined)
      : Promise.resolve();

  event.waitUntil(
    self.registration.showNotification(title, options).then(acknowledge)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  // Get URL from notification data, fallback to "/"
  // Supports both meal_reminder and birthday_reminder notification types
  const notificationType = event.notification.data?.type;
  const destination = event.notification.data?.url || "/";
  
  console.log("Notification clicked:", { type: notificationType, destination });
  
  // For PWA, ensure we use the correct base URL
  const baseUrl = self.location.origin;
  let fullUrl = `${baseUrl}/client`;
  try {
    const target = new URL(destination, baseUrl);
    if (target.origin === baseUrl) fullUrl = target.href;
  } catch {
    // Invalid destinations fall back to the client dashboard.
  }

  event.waitUntil(
    (async () => {
      try {
        // Get all open windows/tabs
        const allClients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        // Check if we have any open client on the same origin
        const sameOriginClient = allClients.find((client) => {
          if (!("url" in client)) return false;
          try {
            const clientUrl = new URL(client.url);
            return clientUrl.origin === baseUrl;
          } catch {
            return false;
          }
        });

        if (sameOriginClient && self.clients.openWindow) {
          // Focus the existing window and navigate to the URL
          // For meal reminders, this includes ogunId query param
          // For birthday reminders, this navigates to /birthdays
          // Keep navigation within waitUntil so the worker cannot stop early.
          if ("navigate" in sameOriginClient && typeof sameOriginClient.navigate === "function") {
            const navigated = await sameOriginClient.navigate(fullUrl);
            if (navigated) await navigated.focus();
            else await self.clients.openWindow(fullUrl);
          } else {
            // Fallback: open new window/tab with the URL
            // This ensures the URL with query params is loaded
            await self.clients.openWindow(fullUrl);
          }
        } else if (self.clients.openWindow) {
          // No existing window, open new one
          const newWindow = await self.clients.openWindow(fullUrl);
          if (!newWindow) {
            console.error("Failed to open window. User may have blocked popups.");
          }
        }
      } catch (error) {
        console.error("Error handling notification click:", error);
        // Fallback: try to open the URL
        if (self.clients.openWindow) {
          await self.clients.openWindow(fullUrl);
        }
      }
    })()
  );
});

async function navigationHandler(request) {
  try {
    // Slow mobile connections must not be aborted into an outdated app shell.
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match("/offline.html");
    return offline || new Response("İnternet bağlantınızı kontrol edip tekrar deneyin.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

function isCacheFirstPath(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/fonts/") ||
    pathname === "/image.png" ||
    pathname === "/icon-192x192.png" ||
    pathname === "/icon-512x512.png" ||
    pathname === "/icon-maskable-512.png" ||
    pathname === "/apple-touch-icon.png"
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(PUSH_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

// Cache Vercel Blob photo URLs indefinitely (they are content-addressed by UUID)
async function blobCacheFirst(request) {
  const cache = await caches.open(BLOB_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("pushsubscriptionchange", (event) => {
  // Saving subscriptions requires the signed-in page's access token. Wake any
  // open page to sync; closed pages resync on their next authenticated launch.
  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    pages.forEach((page) => page.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" }));
  })());
});
