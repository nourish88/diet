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

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const registration = await self.registration;
      await registration.pushManager.getSubscription();
    })()
  );
});

