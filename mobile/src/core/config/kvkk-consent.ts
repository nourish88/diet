/** Sync with web: diet/lib/kvkk-consent-config.ts */
export const KVKK_PORTAL_CONSENT_VERSION = "2026-04-06-v1";

export function consentRequired(
  kvkkPortalConsentAt: string | null | undefined,
  kvkkPortalConsentVersion: string | null | undefined
): boolean {
  if (!kvkkPortalConsentAt || !kvkkPortalConsentVersion) return true;
  return kvkkPortalConsentVersion !== KVKK_PORTAL_CONSENT_VERSION;
}

export const KVKK_INFO_URL = "https://ezgievginaktas.com/kvkk";

export const KVKK_SUMMARY = [
  "Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenir. Uygulama üzerinden paylaştığınız bilgiler diyetisyeninizin danışmanlık hizmeti için kullanılır.",
  "Devam etmek için aydınlatma metnini okuyup aşağıdan açık rıza vermeniz gerekir.",
];
