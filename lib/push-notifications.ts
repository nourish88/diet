"use client";

import { createClient } from "@/lib/supabase-browser";
import { isIOSDevice, isPushSupported, isStandalonePWA } from "@/lib/pwa";
import { getActiveServiceWorker } from "@/lib/service-worker";
import { collectPushDeviceReport } from "@/lib/push-device-client";
import { requestJson } from "@/lib/http-request";
import { reportClientError } from "@/lib/application-error-client";

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
  await requestJson("/api/push/subscribe", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
    timeoutMs: 20000,
  });
}

async function syncSubscription(userId: number, renewSubscription = false): Promise<PushSetupResult> {
  // Use the sender's runtime key: build-time NEXT_PUBLIC values may be stale
  // or missing after deployments, causing subscriptions the server cannot use.
  const config = await requestJson<{ publicKey?: string; configured: boolean }>("/api/push/config", { timeoutMs: 20000 });
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
  const bytes = previousKey ? new Uint8Array(previousKey) : null;
  const keyChanged = bytes && (bytes.length !== applicationServerKey.length || bytes.some((value, i) => value !== applicationServerKey[i]));
  if (subscription && (renewSubscription || keyChanged)) {
    // Explicit repair must obtain a new browser subscription, not merely re-save a stale endpoint.
    await subscriptionRequest("DELETE", { endpoint: subscription.endpoint });
    if (!await subscription.unsubscribe()) return { ok: false, reason: "missing-subscription" };
    subscription = null;
  }
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    } catch {
      return { ok: false, reason: "missing-subscription" };
    }
  }
  // Granted permission alone is not success: the server must know this device.
  await subscriptionRequest("POST", { subscription, userId, device: await collectPushDeviceReport() });
  return { ok: true };
}

export async function setupPushNotificationsForUser(
  userId: number,
  options: { requestPermissionIfDefault?: boolean; renewSubscription?: boolean } = {},
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
  if (existing) {
    if (!options.renewSubscription) return existing;
    await existing.catch(() => undefined);
    return setupPushNotificationsForUser(userId, options);
  }
  const setup = syncSubscription(userId, options.renewSubscription).then((result) => {
    if (!result.ok) reportClientError(null, { code: "push_failed", path: "/api/push/subscribe" });
    return result;
  }).catch((error) => {
    reportClientError(error, { code: "push_failed", path: "/api/push/subscribe" });
    throw error;
  }).finally(() => pendingSetups.delete(userId));
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
