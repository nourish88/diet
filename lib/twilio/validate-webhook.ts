import { createHmac, timingSafeEqual } from "crypto";

/**
 * Validates Twilio webhook signatures (X-Twilio-Signature).
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioWebhookSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!authToken || !signature) return false;

  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Parse application/x-www-form-urlencoded body into flat string params. */
export function parseTwilioFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const [rawKey, rawVal = ""] = pair.split("=");
    if (!rawKey) continue;
    params[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal.replace(/\+/g, " "));
  }
  return params;
}
