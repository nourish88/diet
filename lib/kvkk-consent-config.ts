/**
 * Portal KVKK / özel nitelikli kişisel veri işleme açık rızası — sürüm kodu.
 * Metin değiştiğinde bu sürümü artırın; danışanlardan yeniden onay istenir.
 */
export const KVKK_PORTAL_CONSENT_VERSION = "2026-04-06-v1";

export const KVKK_PORTAL_CONSENT_TYPE = "portal_kvkk_and_health_processing";

/** Özet (tam metin avukat onaylı olmalı; bilgi için site KVKK sayfasına yönlendirin) */
export const KVKK_PORTAL_SUMMARY_PARAGRAPHS: string[] = [
  "Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenir. Portal üzerinden paylaştığınız iletişim, beslenme ve sağlıkla ilgili bilgiler diyetisyeninizin danışmanlık hizmeti için kullanılır.",
  "Aydınlatma metninin tamamını okumanız; aşağıdaki kutuyu işaretleyerek ise özel nitelikli kişisel verilerinizin (sağlık/beslenme verisi) hizmet sunumu amacıyla işlenmesine açık rıza vermeniz gerekmektedir.",
];

export function getKvkkInfoPageUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_KVKK_INFO_URL) {
    return process.env.NEXT_PUBLIC_KVKK_INFO_URL;
  }
  return "https://ezgievginaktas.com/kvkk";
}

export function consentRequired(
  kvkkPortalConsentAt: Date | string | null | undefined,
  kvkkPortalConsentVersion: string | null | undefined
): boolean {
  if (!kvkkPortalConsentAt || !kvkkPortalConsentVersion) {
    return true;
  }
  return kvkkPortalConsentVersion !== KVKK_PORTAL_CONSENT_VERSION;
}
