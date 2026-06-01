const SW_VERSION = "diet-pwa-v3-offline";
const PUSH_CACHE = "diet-pwa-cache-v3";
const RUNTIME_CACHE = "diet-runtime-v2";
const BLOB_CACHE = "diet-blob-v1";
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  console.log(`[ServiceWorker] Installing ${SW_VERSION}`);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log(`[ServiceWorker] Activating ${SW_VERSION}`);
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const currentCaches = new Set([PUSH_CACHE, RUNTIME_CACHE, BLOB_CACHE]);
      await Promise.all(
        cacheNames
          .filter((cacheName) => !currentCaches.has(cacheName))
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

  if (isCacheFirstPath(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isNetworkFirstPath(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaleWhileRevalidatePath(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
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
    tag: payload.tag || undefined, // Tag for replacing notifications
    requireInteraction: payload.requireInteraction || false, // Auto-dismiss after a few seconds
  };

  event.waitUntil(self.registration.showNotification(title, options));
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
  const fullUrl = destination.startsWith("http") 
    ? destination 
    : `${baseUrl}${destination.startsWith("/") ? destination : `/${destination}`}`;

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
          await sameOriginClient.focus();
          // Use navigate if available (Chrome), otherwise the URL change will be handled by the page
          if ("navigate" in sameOriginClient && typeof sameOriginClient.navigate === "function") {
            sameOriginClient.navigate(fullUrl);
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

function isNetworkFirstPath(pathname) {
  return (
    pathname === "/api/clients/my-diets" ||
    pathname === "/api/client/portal/overview" ||
    pathname === "/api/client/portal/conversations" ||
    /^\/api\/clients\/\d+\/diets\/\d+\/messages$/.test(pathname) ||
    /^\/api\/client\/portal\/diets\/\d+$/.test(pathname) ||
    /^\/api\/client\/portal\/diets\/\d+\/messages$/.test(pathname)
  );
}

function isStaleWhileRevalidatePath(pathname) {
  return (
    pathname === "/api/besin-gruplari" ||
    pathname === "/api/birims" ||
    pathname === "/api/besinler"
  );
}

function isCacheFirstPath(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/fonts/") ||
    pathname === "/manifest.json" ||
    pathname === "/image.png" ||
    pathname === "/icon-192x192.png" ||
    pathname === "/icon-512x512.png" ||
    pathname === "/apple-touch-icon.png"
  );
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.warn("[ServiceWorker] SWR fetch failed", request.url, error);
      return cached;
    });

  return cached || networkPromise;
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

function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(request, { signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
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
  event.waitUntil(
    (async () => {
      const registration = await self.registration;
      await registration.pushManager.getSubscription();
    })()
  );
});
