import { createHash } from "crypto";

const PHONE_AUTH_SECRET =
  process.env.CLIENT_PHONE_AUTH_SECRET || "fallback-client-phone-auth-secret";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function isLikelyFakeNationalNumber(national: string): boolean {
  if (/^(\d)\1{9}$/.test(national)) {
    return true;
  }

  if (national === "1234567890" || national === "0123456789") {
    return true;
  }

  return false;
}

export function normalizeClientPhoneNumber(phoneNumber?: string | null): string | null {
  if (!phoneNumber) {
    return null;
  }

  const digits = onlyDigits(phoneNumber);
  let national = "";

  if (digits.length === 10 && digits.startsWith("5")) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith("0") && digits[1] === "5") {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("90") && digits[2] === "5") {
    national = digits.slice(2);
  } else {
    return null;
  }

  if (isLikelyFakeNationalNumber(national)) {
    return null;
  }

  return `+90${national}`;
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
