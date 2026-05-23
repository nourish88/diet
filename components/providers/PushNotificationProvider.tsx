"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { setupPushNotificationsForUser } from "@/lib/push-notifications";

const isSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  typeof Notification !== "undefined";

export default function PushNotificationProvider() {
  const { databaseUser } = useAuth();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!databaseUser || hasAttempted.current || !isSupported()) {
      return;
    }

    hasAttempted.current = true;

    const setup = async () => {
      try {
        await setupPushNotificationsForUser(databaseUser.id);
      } catch (error) {
        console.error("❌ Push notification setup error:", error);
      }
    };

    setup();
  }, [databaseUser]);

  return null;
}
