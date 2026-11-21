"use client";

import { createClient } from "@/lib/supabase-browser";
import { isIOSDevice, isPushSupported, isStandalonePWA } from "@/lib/pwa";
import { getActiveServiceWorker } from "@/lib/service-worker";
import { collectPushDeviceReport } from "@/lib/push-device-client";
import { requestJson } from "@/lib/http-request";
import { reportClientError } from "@/lib/application-error-client";

export type PushSetupResult = {
  ok: boolean;
  needsDeliveryCheck?: boolean;
  reason?: "unsupported" | "install-required" | "denied" | "dismissed" |
    "missing-configuration" | "missing-registration" | "missing-subscription";
};

const pendingSetups = new Map<number, Promise<PushSetupResult>>();

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

async function getPushAccessToken() {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) {
    reportClientError(null, { code: "auth_failed", path: "/api/push/subscribe" });
    throw new Error("Bildirimler için tekrar giriş yapın.");
  }
  return session.access_token;
}

async function subscriptionRequest(method: "POST" | "DELETE", body: unknown, accessToken: string) {
  const path = "/api/push/subscribe";
  try {
    return await requestJson<{ needsDeliveryCheck?: boolean }>(path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
      timeoutMs: 20000,
    });
  } catch (error) {
    // The HTTP client already records network, server and authentication errors.
    const status = (error as { status?: number } | null)?.status;
    if (status && status >= 400 && status < 500 && status !== 401 && status !== 408) {
      reportClientError(error, { code: "push_failed", path, status });
    }
    throw error;
  }
}

async function syncSubscription(userId: number, renewSubscription = false): Promise<PushSetupResult> {
  // Use the sender's runtime key: build-time NEXT_PUBLIC values may be stale
  // or missing after deployments, causing subscriptions the server cannot use.
  const config = await requestJson<{ publicKey?: string; configured: boolean }>("/api/push/config", { timeoutMs: 20000, retryDelayMs: 1000 });
  if (!config.configured || !config.publicKey) {
    reportClientError(null, { code: "push_failed", path: "/api/push/config" });
    return { ok: false, reason: "missing-configuration" };
  }
  const applicationServerKey = urlBase64ToUint8Array(config.publicKey);

  let registration: ServiceWorkerRegistration;
  try {
    registration = await getActiveServiceWorker();
  } catch {
    return { ok: false, reason: "missing-registration" };
  }

  const accessToken = await getPushAccessToken();
  let previousEndpoint: string | undefined;
  let subscription: PushSubscription | null;
  try {
    subscription = await registration.pushManager.getSubscription();
    const previousKey = subscription?.options?.applicationServerKey;
    const bytes = previousKey ? new Uint8Array(previousKey) : null;
    const keyChanged = bytes && (bytes.length !== applicationServerKey.length || bytes.some((value, i) => value !== applicationServerKey[i]));
    if (subscription && (renewSubscription || keyChanged)) {
      previousEndpoint = subscription.endpoint;
      if (!await subscription.unsubscribe()) return { ok: false, reason: "missing-subscription" };
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }
  } catch {
    return { ok: false, reason: "missing-subscription" };
  }
  // Granted permission alone is not success: the server must know this device.
  const saved = await subscriptionRequest("POST", { subscription, userId, previousEndpoint, device: await collectPushDeviceReport() }, accessToken);
  return saved.needsDeliveryCheck ? { ok: true, needsDeliveryCheck: true } : { ok: true };
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
    if (!result.ok && result.reason !== "missing-configuration") reportClientError(null, { code: "push_failed", path: "/api/push/subscribe" });
    return result;
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
      await subscriptionRequest("DELETE", { endpoint: subscription.endpoint }, await getPushAccessToken());
    } finally {
      await subscription.unsubscribe();
    }
  } catch (error) {
    console.error("Push notification cleanup failed:", error);
  }
}
