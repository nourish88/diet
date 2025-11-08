"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-browser";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
const PROMPT_KEY = "diet-push-permission-requested";

const isSupported = () => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    return registration;
  } catch (error) {
    console.error("❌ Service worker registration failed:", error);
    return null;
  }
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  if (!VAPID_PUBLIC_KEY) {
    console.warn("⚠️ NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY is not defined");
    return null;
  }

  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      return existing;
    }

    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  } catch (error) {
    console.error("❌ Failed to subscribe to push notifications:", error);
    return null;
  }
}

async function sendSubscriptionToServer(
  subscription: PushSubscription,
  userId: number,
  accessToken?: string
) {
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        subscription,
        userId,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
  } catch (error) {
    console.error("❌ Failed to persist push subscription:", error);
  }
}

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
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (Notification.permission === "denied") {
          return;
        }

        if (
          Notification.permission === "default" &&
          typeof window !== "undefined"
        ) {
          const alreadyPrompted = window.localStorage.getItem(PROMPT_KEY);
          if (!alreadyPrompted) {
            const permission = await Notification.requestPermission();
            window.localStorage.setItem(PROMPT_KEY, "true");
            if (permission !== "granted") {
              return;
            }
          } else {
            return;
          }
        }

        const registration = await registerServiceWorker();
        if (!registration) {
          return;
        }

        const subscription = await subscribeToPush(registration);
        if (!subscription) {
          return;
        }

        await sendSubscriptionToServer(
          subscription,
          databaseUser.id,
          accessToken
        );
      } catch (error) {
        console.error("❌ Push notification setup error:", error);
      }
    };

    setup();
  }, [databaseUser]);

  return null;
}

