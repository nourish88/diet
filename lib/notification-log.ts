import { failedDeliveryAdvice, renewNotificationRegistration, unconfirmedDeliveryAdvice } from "./client-log-advice";
import { readPushDeviceInfo, type PushDeviceInfo } from "./push-device";

export const DEVICE_ACK_TRACKING_STARTED_AT = new Date("2026-06-04T22:00:00.000Z");
export const RETRY_WAIT_MS = 30_000;
export type DeliveryAttempt = Pick<NotificationLog, "id" | "sentAt" | "status" | "receivedAt">;

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
  retries?: DeliveryAttempt[];
  deviceInfo?: unknown;
  pushStatusCode?: number | null;
  client: { name: string; surname: string };
  ogun: { name: string; time: string } | null;
}

export function notificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    meal_reminder: "30 dk öncesi", meal_time: "Öğün vakti", manual_test: "Manuel Test", delivery_test: "Deneme bildirimi",
  };
  return labels[type] || type;
}

export function getDeviceDeliveryStatus(log: Pick<DeliveryAttempt, "status" | "sentAt" | "receivedAt">, now = Date.now()) {
  if (log.receivedAt) return "delivered";
  if (log.status === "pending") return "sending";
  if (log.status !== "success") return "failed";
  if (new Date(log.sentAt) < DEVICE_ACK_TRACKING_STARTED_AT) return "untracked";
  if (now - new Date(log.sentAt).getTime() < RETRY_WAIT_MS) return "waiting";
  return "unconfirmed";
}

function deviceChecks(device: PushDeviceInfo | null): string[] {
  const test = "Danışandan uygulamayı kapatmasını isteyin. Bir deneme bildirimi gönderip telefonunda görüp görmediğini sorun.";
  if (!device) return [
    "Hedef cihaz bilgisi kaydedilmemiş. Danışandan kullandığı telefon ve tarayıcıyı öğrenin.",
    renewNotificationRegistration,
    test,
  ];
  if (/iOS|iPadOS/i.test(device.os ?? "")) return [
    "iPhone/iPad’de uygulamayı ana ekran simgesinden açın. Simge yoksa tarayıcının Paylaş menüsünden Ana Ekrana Ekle’yi kullanın.",
    "Telefon Ayarlar → Bildirimler bölümünde bu uygulamanın iznini ve Odak ayarlarını kontrol edin.",
    renewNotificationRegistration,
    test,
  ];
  if (device.os === "Android") return [
    `Telefonun uygulama bildirim ayarlarında ${device.browser || "kullanılan tarayıcı"} ve varsa kurulu web uygulaması için bildirim iznini kontrol edin. Tarayıcıdaki bu sitenin bildirim iznini de kontrol edin.`,
    "Telefonun pil ve arka plan veri ayarlarında ilgili tarayıcı/uygulamanın kısıtlanıp kısıtlanmadığını kontrol edin; menü adları modele göre değişebilir.",
    renewNotificationRegistration,
    test,
  ];
  return [
    `${device.browser || "Kullanılan tarayıcı"} içinde bu sitenin bildirim iznini ve işletim sisteminin bildirim/rahatsız etmeyin ayarlarını kontrol edin.`,
    renewNotificationRegistration,
    test,
  ];
}

/** Evidence and suggested checks stay separate: missing ACK never diagnoses OS settings. */
export function diagnoseNotification(log: NotificationLog, now = Date.now()) {
  const device = readPushDeviceInfo(log.deviceInfo);
  const state = getDeviceDeliveryStatus(log, now);
  const checks = deviceChecks(device);
  if (state === "delivered") return {
    clientAdvice: "Bildirimi gördüyseniz her şey yolunda. Görmediyseniz telefonunuzdaki son bildirimlere bakın.",
    label: "Bildirim cihaza ulaştı",
    detail: "Danışanın bildirimi okuyup okumadığını buradan göremiyoruz.",
    steps: ["Danışan bildirimi görmediğini söylüyorsa cihazın bildirim görünürlüğü ve Odak / rahatsız etmeyin ayarlarını kontrol edin."],
  };
  if (state === "sending") return {
    clientAdvice: "Biraz bekleyin.",
    label: "Gönderim sonucu bekleniyor",
    detail: "Bildirim gönderiliyor. Sonucu biraz sonra burada görebilirsiniz.",
    steps: ["Tabloyu yenileyin. Durum değişmiyorsa teknik ekibe kayıt numarası ve gönderim saatini iletin."],
  };
  if (state === "waiting") return {
    clientAdvice: "Biraz bekleyip telefonunuzdaki son bildirimlere bakın.",
    label: "Cihaz yanıtı bekleniyor", detail: "Bildirim az önce gönderildi. Cihaza ulaşıp ulaşmadığını henüz bilmiyoruz.",
    steps: ["Kısa süre sonra tabloyu yenileyin."],
  };
  if (state === "untracked") return {
    clientAdvice: "Bildirimlerin bugün gelip gelmediğini görmek isterseniz diyetisyeninizden bir deneme bildirimi isteyin.",
    label: "Bu kayıtta teslim ölçülmedi", detail: "Bu eski bildirim gönderildiğinde cihaza ulaşıp ulaşmadığı kaydedilmiyordu.", steps: checks,
  };
  if (state === "failed") {
    // Structured codes on new records; strict prefix fallback for historical logs only.
    const code = log.pushStatusCode ?? Number(log.errorMessage?.match(/^\[(\d{3})\]/)?.[1] || 0);
    if (code === 404 || code === 410) return {
      clientAdvice: renewNotificationRegistration,
      label: "Bu cihaza artık bildirim gönderilemiyor",
      detail: "Uygulamanın bu cihaza bildirim göndermek için kullandığı adres artık çalışmıyor.",
      steps: checks,
    };
    if (code === 401 || code === 403) return {
      clientAdvice: failedDeliveryAdvice,
      label: "Uygulama bildirimi gönderemedi",
      detail: "Bildirim göndermek için gereken izin doğrulanamadı. Teknik ekibin kontrol etmesi gerekiyor.",
      steps: ["Teknik ekip sunucudaki VAPID anahtar çiftini ve aboneliğin aynı açık anahtarla oluşturulduğunu kontrol etmeli.", "Sunucu ayarları düzeltildikten sonra danışandan bildirimleri yeniden açmasını isteyip bir deneme bildirimi gönderin."],
    };
    if (code === 413) return {
      clientAdvice: failedDeliveryAdvice,
      label: "Bildirim çok uzun", detail: "Bildirim içeriği izin verilen boyutu aşıyor.",
      steps: ["Teknik ekip bildirim içeriğini küçültüp yeniden göndermeli. Cihaz ayarını değiştirmek bu hatayı çözmez."],
    };
    if (code === 429 || code >= 500 && code <= 599) return {
      clientAdvice: failedDeliveryAdvice,
      label: code === 429 ? "Gönderim sınırına ulaşıldı" : "Gönderim servisinde hata",
      detail: code === 429 ? "Kısa sürede çok fazla bildirim gönderilmeye çalışıldı." : "Bildirimi gönderen hizmette bir sorun çıktı.",
      steps: ["Teknik ekip servis yanıtını inceleyip uygun bekleme süresinden sonra gönderimi tekrar denemeli."],
    };
    return {
      clientAdvice: failedDeliveryAdvice,
      label: "Bildirim gönderilemedi", detail: "Bu kayıttan nedenini göremiyoruz.",
      steps: ["Teknik ekibe kayıt numarası, gönderim saati ve Sunucu sütunundaki hata bilgisini iletin."],
    };
  }
  return {
    clientAdvice: unconfirmedDeliveryAdvice,
    label: "Ulaşıp ulaşmadığı bilinmiyor",
    detail: "Bildirim gönderildi. Cihazdan yanıt gelmediği için danışanın ekranında görünüp görünmediğini bilmiyoruz.",
    steps: checks,
  };
}
