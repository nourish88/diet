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

    const retryAcks = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        navigator.serviceWorker?.controller?.postMessage({ type: "RETRY_PUSH_ACKS" });
      }
    };
    window.addEventListener("online", retryAcks);
    document.addEventListener("visibilitychange", retryAcks);
    navigator.serviceWorker?.addEventListener?.("controllerchange", retryAcks);
    retryAcks();
    registerAppServiceWorker()
      .catch((error) => {
        console.error("❌ Service worker registration failed:", error);
      });
    return () => {
      stopObserving();
      window.removeEventListener("online", retryAcks);
      document.removeEventListener("visibilitychange", retryAcks);
      navigator.serviceWorker?.removeEventListener?.("controllerchange", retryAcks);
    };
  }, []);

  return null;
}
