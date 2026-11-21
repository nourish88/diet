import { readPushDeviceInfo, type PushDeviceInfo } from "./push-device";

export const DEVICE_ACK_TRACKING_STARTED_AT = new Date("2026-06-04T22:00:00.000Z");

export interface NotificationLog {
  id: number;
  type: string;
  title: string | null;
  body: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string;
  receivedAt: string | null;
  subscriptionId?: number | null;
  deviceInfo?: unknown;
  pushStatusCode?: number | null;
  client: { name: string; surname: string };
  ogun: { name: string; time: string } | null;
}

export function notificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    meal_reminder: "30 dk öncesi", meal_time: "Öğün vakti", manual_test: "Manuel Test",
  };
  return labels[type] || type;
}

export function getDeviceDeliveryStatus(log: NotificationLog, now = Date.now()) {
  if (log.receivedAt) return "delivered";
  if (log.status === "pending") return "sending";
  if (log.status !== "success") return "failed";
  if (new Date(log.sentAt) < DEVICE_ACK_TRACKING_STARTED_AT) return "untracked";
  if (now - new Date(log.sentAt).getTime() < 30_000) return "waiting";
  return "unconfirmed";
}

function deviceChecks(device: PushDeviceInfo | null): string[] {
  const refresh = "Bu cihazda uygulamaya giriş yapın; Ayarlar → Bildirim kaydını yenile (izin yoksa Bildirimleri aç) adımını uygulayın.";
  const test = "Kaydı yeniledikten sonra uygulamayı kapatıp test bildirimi gönderin; yenilenen cihazın yeni satırını kontrol edin.";
  if (!device) return [
    "Hedef cihaz bilgisi kaydedilmemiş. Danışandan kullandığı telefon ve tarayıcıyı öğrenin.",
    refresh,
    test,
  ];
  if (/iOS|iPadOS/i.test(device.os ?? "")) return [
    "iPhone/iPad’de uygulamayı ana ekran simgesinden açın. Simge yoksa tarayıcının Paylaş menüsünden Ana Ekrana Ekle’yi kullanın.",
    "Telefon Ayarlar → Bildirimler bölümünde bu uygulamanın iznini ve Odak ayarlarını kontrol edin.",
    refresh,
    test,
  ];
  if (device.os === "Android") return [
    `Telefonun uygulama bildirim ayarlarında ${device.browser || "kullanılan tarayıcı"} ve varsa kurulu web uygulaması için bildirim iznini kontrol edin. Tarayıcıdaki bu sitenin bildirim iznini de kontrol edin.`,
    "Telefonun pil ve arka plan veri ayarlarında ilgili tarayıcı/uygulamanın kısıtlanıp kısıtlanmadığını kontrol edin; menü adları modele göre değişebilir.",
    refresh,
    test,
  ];
  return [
    `${device.browser || "Kullanılan tarayıcı"} içinde bu sitenin bildirim iznini ve işletim sisteminin bildirim/rahatsız etmeyin ayarlarını kontrol edin.`,
    refresh,
    test,
  ];
}

/** Evidence and suggested checks stay separate: missing ACK never diagnoses OS settings. */
export function diagnoseNotification(log: NotificationLog, now = Date.now()) {
  const device = readPushDeviceInfo(log.deviceInfo);
  const state = getDeviceDeliveryStatus(log, now);
  const checks = deviceChecks(device);
  if (state === "delivered") return {
    label: "Cihaz teslim onayı verdi",
    detail: "Bu gönderim için cihazdan onay alındı. Danışanın bildirimi okuduğu ölçülmez.",
    steps: ["Danışan bildirimi görmediğini söylüyorsa cihazın bildirim görünürlüğü ve Odak / rahatsız etmeyin ayarlarını kontrol edin."],
  };
  if (state === "sending") return {
    label: "Gönderim sonucu bekleniyor",
    detail: "Gönderim başladı; servis sonucu henüz kayda yazılmadı. Bu durum uzun sürerse sunucu günlükleri incelenmeli.",
    steps: ["Tabloyu yenileyin. Durum değişmiyorsa teknik ekibe kayıt numarası ve gönderim saatini iletin."],
  };
  if (state === "waiting") return {
    label: "Cihaz yanıtı bekleniyor", detail: "Gönderim servisi kabul etti; ilk 30 saniye içinde cihaz onayı bekleniyor.",
    steps: ["Kısa süre sonra tabloyu yenileyin."],
  };
  if (state === "untracked") return {
    label: "Bu kayıtta teslim ölçülmedi", detail: "Kayıt, cihaz onayı takibinden önce oluşturuldu.", steps: checks,
  };
  if (state === "failed") {
    // Structured codes on new records; strict prefix fallback for historical logs only.
    const code = log.pushStatusCode ?? Number(log.errorMessage?.match(/^\[(\d{3})\]/)?.[1] || 0);
    if (code === 404 || code === 410) return {
      label: "Bildirim aboneliği geçersiz",
      detail: `Gönderim servisi bu aboneliği kabul etmedi (HTTP ${code}). Kaydın neden geçersizleştiği servis yanıtından anlaşılamaz.`,
      steps: checks,
    };
    if (code === 401 || code === 403) return {
      label: "Gönderim yetkilendirmesi reddedildi",
      detail: `Gönderim servisi HTTP ${code} döndürdü. Sunucu anahtarı / abonelik eşleşmesi kontrol edilmeli.`,
      steps: ["Teknik ekip sunucudaki VAPID anahtar çiftini ve aboneliğin aynı açık anahtarla oluşturulduğunu kontrol etmeli.", "Sunucu ayarları düzeltildikten sonra hedef cihazın bildirim kaydını yenileyip tekrar test edin."],
    };
    if (code === 413) return {
      label: "Bildirim içeriği çok büyük", detail: "Gönderim servisi içerik boyutunu reddetti (HTTP 413).",
      steps: ["Teknik ekip bildirim içeriğini küçültüp yeniden göndermeli. Cihaz ayarını değiştirmek bu hatayı çözmez."],
    };
    if (code === 429 || code >= 500 && code <= 599) return {
      label: code === 429 ? "Gönderim sınırına ulaşıldı" : "Gönderim servisinde hata",
      detail: `Gönderim servisi HTTP ${code} döndürdü; cihaz kaynaklı bir hata doğrulanmadı.`,
      steps: ["Teknik ekip servis yanıtını inceleyip uygun bekleme süresinden sonra gönderimi tekrar denemeli."],
    };
    return {
      label: "Sunucu gönderimi tamamlayamadı", detail: "Gönderim hatası kaydedildi. Mevcut bilgilerle cihaz kaynaklı olduğu söylenemez.",
      steps: ["Teknik ekibe kayıt numarası, gönderim saati ve Sunucu sütunundaki hata bilgisini iletin."],
    };
  }
  return {
    label: "Ulaşmama nedeni belirlenemedi",
    detail: "Servis gönderimi kabul etti; cihaz teslim onayı vermedi. Bağlantı, izin, arka plan kısıtlaması, eski abonelik veya onay isteği hatası bu kayıttan ayırt edilemiyor.",
    steps: checks,
  };
}
