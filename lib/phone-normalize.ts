import parsePhoneNumberFromString from "libphonenumber-js";

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

/**
 * Single source of truth for client phone validation/normalization (E.164).
 * Safe to import from client components (no Node crypto).
 */
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
