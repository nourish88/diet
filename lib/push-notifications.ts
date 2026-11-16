"use client";

import { createClient } from "@/lib/supabase-browser";
import { isIOSDevice, isPushSupported, isStandalonePWA } from "@/lib/pwa";
import { getActiveServiceWorker } from "@/lib/service-worker";

export type PushSetupResult = {
  ok: boolean;
  reason?: "unsupported" | "install-required" | "denied" | "dismissed" |
    "missing-configuration" | "missing-registration" | "missing-subscription";
};

const pendingSetups = new Map<number, Promise<PushSetupResult>>();

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

async function subscriptionRequest(method: "POST" | "DELETE", body: unknown) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) throw new Error("Bildirimler için tekrar giriş yapın.");
  const response = await fetch("/api/push/subscribe", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Cihaz bildirim kaydı kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.");
}

async function syncSubscription(userId: number): Promise<PushSetupResult> {
  // Use the sender's runtime key: build-time NEXT_PUBLIC values may be stale
  // or missing after deployments, causing subscriptions the server cannot use.
  const response = await fetch("/api/push/config", { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Bildirim ayarları alınamadı. Tekrar deneyin.");
  const config: { publicKey?: string; configured: boolean } = await response.json();
  if (!config.configured || !config.publicKey) return { ok: false, reason: "missing-configuration" };
  const applicationServerKey = urlBase64ToUint8Array(config.publicKey);

  let registration: ServiceWorkerRegistration;
  try {
    registration = await getActiveServiceWorker();
  } catch {
    return { ok: false, reason: "missing-registration" };
  }

  let subscription = await registration.pushManager.getSubscription();
  const previousKey = subscription?.options.applicationServerKey;
  if (subscription && previousKey) {
    const bytes = new Uint8Array(previousKey);
    if (bytes.length !== applicationServerKey.length || bytes.some((value, i) => value !== applicationServerKey[i])) {
      // Retire the old endpoint before creating one for the rotated VAPID key.
      await subscriptionRequest("DELETE", { endpoint: subscription.endpoint });
      if (!await subscription.unsubscribe()) return { ok: false, reason: "missing-subscription" };
      subscription = null;
    }
  }
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    } catch {
      return { ok: false, reason: "missing-subscription" };
    }
  }
  // Granted permission alone is not success: the server must know this device.
  await subscriptionRequest("POST", { subscription, userId });
  return { ok: true };
}

export async function setupPushNotificationsForUser(
  userId: number,
  options: { requestPermissionIfDefault?: boolean } = {},
): Promise<PushSetupResult> {
  if (isIOSDevice() && !isStandalonePWA()) return { ok: false, reason: "install-required" };
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (Notification.permission === "denied") return { ok: false, reason: "denied" };
  if (Notification.permission === "default") {
    if (!options.requestPermissionIfDefault) return { ok: false, reason: "dismissed" };
    // Keep this before any async work: Safari requires a direct user gesture.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: permission === "denied" ? "denied" : "dismissed" };
  }
  const existing = pendingSetups.get(userId);
  if (existing) return existing;
  const setup = syncSubscription(userId).finally(() => pendingSetups.delete(userId));
  pendingSetups.set(userId, setup);
  return setup;
}

export async function removePushNotificationsForCurrentBrowser(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    // ready never settles if registration failed; logout must still complete.
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    try {
      await subscriptionRequest("DELETE", { endpoint: subscription.endpoint });
    } finally {
      await subscription.unsubscribe();
    }
  } catch (error) {
    console.error("Push notification cleanup failed:", error);
  }
}
