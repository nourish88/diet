import type { ApplicationErrorCode } from "./application-errors";

export const reopenNotificationsLabel = "Bildirimleri yeniden aç";

export const renewNotificationRegistration =
  `Uygulamada Ayarlar’a girin. Bildirim Tercihleri altında “${reopenNotificationsLabel}”e dokunun. Ekranda “Bildirimleri aç” yazıyorsa ona dokunun.`;

export const unconfirmedDeliveryAdvice =
  `Bildirimi gördüyseniz her şey yolunda. Bildirimler hiç gelmiyorsa telefonunuzda şu adımları deneyin. ${renewNotificationRegistration} Sonra diyetisyeninizden bir deneme bildirimi isteyin.`;

export const failedDeliveryAdvice =
  "Bu bildirimi bekliyorsanız diyetisyeninize haber verin.";

const reportProblem = "Yine olmazsa diyetisyeninize ne yaparken sorun yaşadığınızı söyleyin.";
const checkResult = "Uygulamayı tekrar açın. Son yaptığınız değişiklik ekranda görünüyor mu diye bakın.";
export const errorHeadings: Record<ApplicationErrorCode, string> = {
  timeout: "Uygulama zamanında yanıt alamadı.",
  network_error: "Uygulama bağlantı kuramadı.",
  http_error: "İşlem tamamlanamadı.",
  auth_failed: "Hesaba giriş veya erişim sırasında sorun çıktı.",
  database_connection: "Uygulama kayıtlı bilgilere ulaşamadı.",
  database_query: "Uygulama kayıtlı bilgilerle ilgili işlemi tamamlayamadı.",
  push_failed: "Bildirimler açılırken veya gönderilirken sorun çıktı.",
  delivery_unconfirmed: "Kontrol edildiğinde bildirimin cihaza ulaşıp ulaşmadığı bilinmiyordu.",
  javascript_error: "Uygulama bu ekranda bir sorunla karşılaştı.",
  pdf_failed: "Diyet listesi PDF olarak hazırlanamadı.",
  invalid_response: "Uygulama gelen yanıtı okuyamadı.",
  job_failed: "Otomatik yapılacak bir işlem tamamlanamadı.",
};

const adviceByError = {
  timeout: `Biraz bekleyin. ${checkResult} ${reportProblem}`,
  network_error: `İnternet bağlantınızı kontrol edin. ${checkResult} ${reportProblem}`,
  http_error: `${checkResult} ${reportProblem}`,
  auth_failed: "Uygulamaya yeniden giriş yapın. Giriş yapamıyorsanız diyetisyeninize haber verin.",
  database_connection: `Biraz bekleyin. ${checkResult}`,
  database_query: `${checkResult} ${reportProblem}`,
  push_failed: failedDeliveryAdvice,
  delivery_unconfirmed: unconfirmedDeliveryAdvice,
  javascript_error: `Uygulamayı kapatıp yeniden açın. ${reportProblem}`,
  pdf_failed: "Diyet listenizi uygulamadan açabilirsiniz. PDF dosyasına ihtiyacınız varsa diyetisyeninize haber verin.",
  invalid_response: `${checkResult} ${reportProblem}`,
  job_failed: "Beklediğiniz bilgi uygulamada görünmüyorsa diyetisyeninize haber verin.",
} satisfies Record<ApplicationErrorCode, string>;

export function applicationErrorAdvice(code: string, path: string) {
  if (code === "timeout" || code === "network_error") {
    const reconnect = "İnternet bağlantınızı kontrol edin.";
    if (path === "/api/push/subscribe") {
      return `${reconnect} Uygulamada Ayarlar → Bildirim Tercihleri bölümünü yeniden açın. “Bildirimleri aç” görünüyorsa ona dokunun.`;
    }
    if (path === "/api/client/portal/notifications") return `${reconnect} Uygulamadaki bildirim listesini yeniden açın.`;
    if (path === "/api/notifications/check-meal-reminders") return `${reconnect} Ayarlar → Bildirim Tercihleri bölümünde “Hatırlatıcıları Kontrol Et”e dokunun.`;
    if (path === "/api/diets/:id/track") return "Listenizi açtıysanız veya indirdiyseniz başka bir şey yapmanız gerekmez. Açılmadıysa internetinizi kontrol edip tekrar deneyin.";
  }
  if (Object.hasOwn(adviceByError, code)) return adviceByError[code as ApplicationErrorCode];
  return reportProblem;
}
