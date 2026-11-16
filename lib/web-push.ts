import webpush from "web-push";
import { createECDH } from "node:crypto";

const contactEmail =
  process.env.WEB_PUSH_CONTACT_EMAIL || "mailto:admin@example.com";
const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
let configured = false;

if (publicKey && privateKey) {
  const subject = (() => {
    if (!contactEmail) return "mailto:admin@example.com";
    const trimmed = contactEmail.trim();
    if (trimmed.startsWith("mailto:") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `mailto:${trimmed}`;
  })();

  try {
    const keyPair = createECDH("prime256v1");
    keyPair.setPrivateKey(Buffer.from(privateKey, "base64url"));
    if (!keyPair.getPublicKey().equals(Buffer.from(publicKey, "base64url"))) {
      throw new Error("VAPID key pair does not match");
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch {
    console.error("[WebPush] Invalid VAPID key pair or contact. Check WEB_PUSH environment variables.");
  }
} else {
  console.warn(
    "⚠️ Web push is not fully configured. Set WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY environment variables."
  );
}

export function isWebPushConfigured() {
  return configured;
}

export function getWebPushPublicKey() {
  return publicKey;
}

export function sendWebPushNotification(
  subscription: webpush.PushSubscription,
  payload: Record<string, unknown>
) {
  if (!isWebPushConfigured()) {
    return Promise.reject(new Error("Web push configuration is missing"));
  }

  return webpush.sendNotification(subscription, JSON.stringify(payload), { timeout: 10000 });
}
