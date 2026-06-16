"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on first load for every visitor, independent of
 * auth state or notification permission. This is required for PWA
 * installability: Chrome only offers "Install app" (and builds a WebAPK on
 * Android) when a service worker with a fetch handler controls the page. Push
 * subscription stays gated behind permission in PushNotificationProvider; this
 * just guarantees the SW exists so the app is always installable.
 */
export default function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => {
        console.error("❌ Service worker registration failed:", error);
      });
  }, []);

  return null;
}
