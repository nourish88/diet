/** Historical version: old records cannot prove acceptance of new documents. */
export const KVKK_PORTAL_CONSENT_VERSION = "2026-04-06-v1";
export const KVKK_PORTAL_CONSENT_TYPE = "portal_kvkk_and_health_processing";
export const HEALTH_PROCESSING_CONSENT_TYPE = "health_processing";
export const KVKK_PORTAL_SUMMARY_PARAGRAPHS = [
  "Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenir. Portal üzerinden paylaştığınız iletişim, beslenme ve sağlıkla ilgili bilgiler diyetisyeninizin danışmanlık hizmeti için kullanılır.",
  "Aydınlatma metninin tamamını okumanız; aşağıdaki kutuyu işaretleyerek ise özel nitelikli kişisel verilerinizin (sağlık/beslenme verisi) hizmet sunumu amacıyla işlenmesine açık rıza vermeniz gerekmektedir.",
];
export function getKvkkInfoPageUrl(): string {
  return process.env.NEXT_PUBLIC_KVKK_INFO_URL || "https://ezgievginaktas.com/kvkk";
}
export function consentRequired(at: Date | string | null | undefined, version: string | null | undefined): boolean {
  return !at || version !== KVKK_PORTAL_CONSENT_VERSION;
}

export const PRIVACY_ACTION_LABELS: Record<string, string> = {
  notice_acknowledged: "Aydınlatma sunuldu / okundu",
  granted: "Açık rıza verildi",
  declined: "Açık rıza verilmedi",
  withdrawn: "Açık rıza geri çekildi",
  legacy_accepted: "Eski birleşik onay (metin kopyası yok)",
};
export const PRIVACY_REQUEST_KINDS = {
  information: "Verilerim ve işleme amaçları hakkında bilgi",
  access: "Kişisel verilerimin bir kopyası",
  correction: "Eksik / yanlış verilerin düzeltilmesi",
  erasure: "Silme, yok etme veya anonim hale getirme",
  recipients: "Verilerin aktarıldığı kişiler ve yapılan işlemlerin bildirimi",
  objection: "Otomatik analiz sonucuna itiraz",
  compensation: "Zararın giderilmesi",
} as const;
export const PRIVACY_REQUEST_STATUS_LABELS: Record<string, string> = {
  received: "Alındı", identity_required: "Kimlik doğrulaması bekleniyor",
  under_review: "İnceleniyor", fulfilled: "Talep yerine getirildi", rejected: "Gerekçeli ret", response_accessed: "Cevap portal üzerinden alındı",
};
export interface PrivacyDocument {
  controllerName: string;
  controllerAddress: string;
  contactEmail: string;
  collectionMethods: string;
  processingDetails: string;
  recipients: string;
  internationalTransfers: string;
  retentionPolicy: string;
  healthDataCategories: string;
  healthPurpose: string;
  healthLegalJustification: string;
  refusalConsequences: string;
  noticeText: string;
  consentText: string | null;
}
export interface PublishedPrivacyPolicy {
  id: string;
  version: string;
  healthLegalBasis: "explicit_consent" | "healthcare";
  document: PrivacyDocument;
  documentHash: string;
  publishedAt: string;
}
export interface PrivacyStatus {
  mode?: "legacy" | "managed";
  policy: PublishedPrivacyPolicy | null;
  noticeAcknowledged: boolean;
  healthConsent: "granted" | "declined" | "withdrawn" | null;
  canProcessHealth: boolean;
}
