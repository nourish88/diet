import { createHash } from "crypto";
import parsePhoneNumberFromString from "libphonenumber-js";

const PHONE_AUTH_SECRET =
  process.env.CLIENT_PHONE_AUTH_SECRET || "fallback-client-phone-auth-secret";

function isLikelyFakeNationalNumber(national: string): boolean {
  if (/^(\d)\1{9}$/.test(national)) {
    return true;
  }

  if (national === "1234567890" || national === "0123456789") {
    return true;
  }

  return false;
}

/** Normalize leading international prefix (00 → +) for easier parsing. */
function preprocessPhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (/^00\d/.test(trimmed)) {
    return `+${trimmed.slice(2)}`;
  }
  return trimmed;
}

export function normalizeClientPhoneNumber(phoneNumber?: string | null): string | null {
  if (!phoneNumber) {
    return null;
  }

  const cleaned = preprocessPhoneInput(phoneNumber);
  if (!cleaned) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(cleaned, "TR");
  if (!parsed || !parsed.isValid()) {
    return null;
  }

  const e164 = parsed.format("E.164");

  if (parsed.country === "TR") {
    const national = parsed.nationalNumber;
    if (/^5\d{9}$/.test(national) && isLikelyFakeNationalNumber(national)) {
      return null;
    }
  }

  return e164;
}

export function buildClientPhoneCredentials(normalizedPhone: string): {
  email: string;
  password: string;
} {
  const idHash = createHash("sha256")
    .update(`id:${normalizedPhone}:${PHONE_AUTH_SECRET}`)
    .digest("hex")
    .slice(0, 24);

  const passwordHash = createHash("sha256")
    .update(`pw:${normalizedPhone}:${PHONE_AUTH_SECRET}`)
    .digest("hex");

  return {
    email: `client.${idHash}@phone-login.local`,
    password: `Pw!${passwordHash.slice(0, 20)}`,
  };
}
