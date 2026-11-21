"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { setupPushNotificationsForUser } from "@/lib/push-notifications";
import { isPushSupported } from "@/lib/pwa";

export default function PushNotificationProvider() {
  const { databaseUser } = useAuth();
  const userId = databaseUser?.id;

  useEffect(() => {
    if (!userId || !isPushSupported()) return;
    let disposed = false;
    let busy = false;
    let nextAttempt = 0;
    let retryDelay = 30000;
    const sync = async () => {
      if (disposed || busy || document.visibilityState !== "visible" ||
          Notification.permission !== "granted" || !navigator.onLine || Date.now() < nextAttempt) return;
      busy = true;
      try {
        const result = await setupPushNotificationsForUser(userId);
        if (result.ok) {
          nextAttempt = Date.now() + 6 * 60 * 60 * 1000;
          retryDelay = 30000;
          return;
        }
      } catch (error) {
        console.error("Push subscription sync failed:", error);
      } finally {
        busy = false;
      }
      nextAttempt = Date.now() + retryDelay;
      retryDelay = Math.min(2 * retryDelay, 15 * 60000);
    };
    const reconnect = () => {
      nextAttempt = 0;
      void sync();
    };
    void sync();
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        reconnect();
      }
    };
    window.addEventListener("online", reconnect);
    navigator.serviceWorker?.addEventListener?.("message", onMessage);
    document.addEventListener("visibilitychange", sync);
    const interval = setInterval(sync, 60000);
    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("online", reconnect);
      navigator.serviceWorker?.removeEventListener?.("message", onMessage);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [userId]);

  return null;
}
