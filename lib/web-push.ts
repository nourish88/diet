import webpush from "web-push";

const contactEmail =
  process.env.WEB_PUSH_CONTACT_EMAIL || "mailto:admin@example.com";
const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

if (publicKey && privateKey) {
  const subject = (() => {
    if (!contactEmail) return "mailto:admin@example.com";
    const trimmed = contactEmail.trim();
    if (trimmed.startsWith("mailto:") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `mailto:${trimmed}`;
  })();

  console.log(
    `[WebPush] Initializing VAPID credentials`,
    JSON.stringify({
      subject,
      hasPublicKey: Boolean(publicKey),
      hasPrivateKey: Boolean(privateKey),
    })
  );

  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn(
    "⚠️ Web push is not fully configured. Set WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY environment variables."
  );
}

export function isWebPushConfigured() {
  return Boolean(publicKey && privateKey);
}

export function sendWebPushNotification(
  subscription: webpush.PushSubscription,
  payload: Record<string, unknown>
) {
  if (!isWebPushConfigured()) {
    console.warn(
      "[WebPush] Configuration missing, skipping notification send.",
      JSON.stringify({
        endpoint: subscription.endpoint,
      })
    );
    return Promise.resolve();
  }

  return webpush.sendNotification(subscription, JSON.stringify(payload));
}
