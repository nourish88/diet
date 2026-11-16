"use client";

import { useEffect } from "react";
import { registerAppServiceWorker } from "@/lib/service-worker";
import { observeInstallPrompt } from "@/lib/pwa-install";

/**
 * Registers the service worker on first load for every visitor, independent of
 * auth state or notification permission. Installation availability is decided
 * by the browser; registration alone does not guarantee installability. Push
 * subscription stays gated behind permission in PushNotificationProvider.
 */
export default function ServiceWorkerProvider() {
  useEffect(() => {
    const stopObserving = observeInstallPrompt();
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return stopObserving;
    }

    registerAppServiceWorker()
      .catch((error) => {
        console.error("❌ Service worker registration failed:", error);
      });
    return stopObserving;
  }, []);

  return null;
}
