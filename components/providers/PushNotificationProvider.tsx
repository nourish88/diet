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
    let lastAttempt = 0;
    const sync = async () => {
      if (disposed || busy || document.visibilityState !== "visible" ||
          Notification.permission !== "granted" || !navigator.onLine || Date.now() - lastAttempt < 30000) return;
      busy = true;
      lastAttempt = Date.now();
      try {
        await setupPushNotificationsForUser(userId);
      } catch (error) {
        console.error("Push subscription sync failed:", error);
      } finally {
        busy = false;
      }
    };
    void sync();
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        lastAttempt = 0;
        void sync();
      }
    };
    window.addEventListener("online", sync);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", sync);
    const interval = setInterval(sync, 60000);
    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("online", sync);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [userId]);

  return null;
}
