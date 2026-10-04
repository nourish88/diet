import { HttpError } from "@/lib/api/handler";

/** Enforcement is opt-in, after migration and reviewed policy publication. */
export function privacyV2Enabled(): boolean {
  return process.env.KVKK_PRIVACY_V2_ENABLED === "true";
}

export function requirePrivacyV2(): void {
  if (!privacyV2Enabled()) throw new HttpError("conflict", "Yeni KVKK başvuru akışı henüz etkinleştirilmedi. Mevcut başvuru kanallarını kullanın.");
}
