const SW_VERSION = "diet-pwa-v9";
const PUSH_CACHE = `${SW_VERSION}-static`;
const BLOB_CACHE = "diet-blob-v2";
const ACK_CACHE = "diet-delivery-acks-v1";
const ACK_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
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
      const currentCaches = new Set([PUSH_CACHE, BLOB_CACHE, SHELL_CACHE, ACK_CACHE]);
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
    event.respondWith(cacheFirst(request, BLOB_CACHE));
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
    event.respondWith(cacheFirst(request, PUSH_CACHE));
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
      ...payload.data,
      url: payload.data?.url || payload.url,
    },
    vibrate: [100, 50, 100],
    actions: payload.actions || [],
    tag: payload.tag || undefined, // Tag for replacing notifications
    requireInteraction: payload.requireInteraction || false, // Auto-dismiss after a few seconds
  };

  event.waitUntil(self.registration.showNotification(title, options).then(async () => {
    const receipt = {};
    for (const field of ["logId", "broadcastRecipientId"]) {
      const id = payload.data?.[field];
      if (Number.isSafeInteger(id) && id > 0) receipt[field] = id;
    }
    if (Object.keys(receipt).length) await acknowledgeDelivery(receipt);
    else await retryPendingAcks();
  }));
});

// Store only the receipt IDs. Keeping one cache entry per receipt avoids lost
// updates when multiple push events arrive or the worker restarts.
async function acknowledgeDelivery(receipt) {
  const key = new URL("/api/push/ack", self.location.origin);
  for (const [field, id] of Object.entries(receipt)) key.searchParams.set(field, id);
  let cache;
  try {
    cache = await caches.open(ACK_CACHE);
    await cache.put(key.href, new Response(JSON.stringify({ receipt, queuedAt: Date.now() })));
  } catch {
    // Storage may be unavailable even while the acknowledgement API is online.
  }
  let complete = await postReceipt(receipt);
  if (!complete) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    complete = await postReceipt(receipt);
  }
  if (complete && cache) await cache.delete(key.href).catch(() => {});
  await retryPendingAcks(key.href);
}

async function postReceipt(receipt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api/push/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(receipt),
      signal: controller.signal,
    });
    return response.status === 400 || (response.ok && (await response.json()).ok === true);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let pendingAckFlush;
function retryPendingAcks(excludeUrl) {
  if (!pendingAckFlush) {
    pendingAckFlush = flushAckCache(excludeUrl).finally(() => { pendingAckFlush = undefined; });
  }
  return pendingAckFlush;
}

async function flushAckCache(excludeUrl) {
  try {
    const cache = await caches.open(ACK_CACHE);
    const keys = await cache.keys();
    const excess = Math.max(0, keys.length - 100);
    await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
    const pending = keys.slice(excess).filter((key) => key.url !== excludeUrl);
    for (let start = 0; start < pending.length; start += 8) {
      const results = await Promise.all(pending.slice(start, start + 8).map(async (key) => {
        const entry = await cache.match(key);
        if (!entry) return true;
        const { queuedAt, receipt } = await entry.json();
        if (queuedAt < Date.now() - ACK_RETENTION_MS || await postReceipt(receipt)) {
          await cache.delete(key);
          return true;
        }
        return false;
      }));
      if (results.every((complete) => !complete)) break;
    }
  } catch {
    // A failed flush must never interrupt display or navigation.
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "RETRY_PUSH_ACKS") event.waitUntil(retryPendingAcks());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(openNotification(event.notification.data?.url));
});

async function openNotification(destination) {
  const origin = self.location.origin;
  let target = new URL("/client", origin);
  try {
    const url = new URL(destination || "/client", origin);
    if (url.origin === origin && /^https?:$/.test(url.protocol)) target = url;
  } catch {
    // Older notifications may lack a usable destination.
  }
  let windows = [];
  try {
    windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url === target.href);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: "NOTIFICATION_FOCUSED" });
      return;
    }
  } catch {
    // A suspended or closed window can disappear between lookup and focus.
  }
  // Open the deep link while the click is active, without waiting for another
  // tab to navigate over the network or replacing an in-progress diet form.
  try {
    await self.clients.openWindow(target.href);
  } catch (error) {
    // Some browsers refuse a new window but still allow navigation in an
    // existing portal window. Leave other tabs (including diet editors) alone.
    const portalPrefix = origin + "/client";
    const isPortal = (url) => url === portalPrefix || url.startsWith(portalPrefix + "/");
    const portal = isPortal(target.origin + target.pathname) && windows.find((client) => isPortal(client.url));
    if (!portal) throw error;
    await portal.focus();
    await portal.navigate(target.href);
  }
}

async function navigationHandler(request) {
  try {
    return await fetch(request);
  } catch (error) {
    if (request.signal?.aborted) throw error;
    if (self.navigator?.onLine !== false) {
      // On resume the network may need a moment before its first request succeeds.
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (request.signal?.aborted) throw error;
      try {
        return await fetch(request);
      } catch (retryError) {
        if (request.signal?.aborted) throw retryError;
      }
    }
    try {
      const cache = await caches.open(SHELL_CACHE);
      const offline = await cache.match("/offline.html");
      if (offline) return offline;
    } catch {
      // Private browsing and storage quotas can make Cache Storage unavailable.
    }
    return new Response("Uygulamaya şu anda ulaşılamıyor. Sayfayı yeniden yükleyin.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
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

async function cacheFirst(request, cacheName) {
  let cache;
  try {
    cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
  } catch {
    // A cache read failure should still allow an online launch.
  }
  const response = await fetch(request);
  if (cache && response.ok) {
    await cache.put(request, response.clone()).catch(() => {});
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
