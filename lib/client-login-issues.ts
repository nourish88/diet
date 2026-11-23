export const clientLoginIssues = {
  "invalid-phone": { label: "Telefon numarası eksik veya hatalı girildi.", advice: "Danışandan telefon numarasını başında 0 veya ülke koduyla yeniden girmesini isteyin." },
  "phone-not-registered": { label: "Girilen telefon numarasıyla kayıt bulunamadı.", advice: "Danışandan numarayı kontrol etmesini isteyin. Danışan kartındaki numarayı da kontrol edin." },
  connection: { label: "Giriş sırasında bağlantı kurulamadı.", advice: "Danışandan internet bağlantısını kontrol edip yeniden giriş yapmasını isteyin." },
  timeout: { label: "Giriş ekranı zamanında yanıt alamadı.", advice: "Danışandan biraz bekleyip tekrar denemesini isteyin." },
  lookup: { label: "Danışan profili aranırken bir sorun çıktı.", advice: "Danışandan Profili Bul düğmesine tekrar dokunmasını isteyin." },
  session: { label: "Danışanın hesabı açılamadı.", advice: "Danışandan yeniden giriş yapmasını isteyin. Sorun sürerse hesabını kontrol edin." },
  account: { label: "Danışanın hesap bilgileri doğrulanamadı.", advice: "Danışanın hesap durumunu ve kayıtlı telefon numarasını kontrol edin." },
  profile: { label: "Seçilen profil onaylanamadı.", advice: "Danışandan numarasını tekrar girip doğru profili seçmesini isteyin." },
} as const;

type LoginIssue = keyof typeof clientLoginIssues;
export type LoginStage = "lookup" | "session" | "account" | "profile";

export function loginIssueFromPath(path: string) {
  const reason = path.startsWith("/login/") ? path.slice(7) : "";
  return Object.hasOwn(clientLoginIssues, reason) ? clientLoginIssues[reason as LoginIssue] : null;
}

export function clientLoginIssuePath(error: unknown, stage: LoginStage): string {
  const failure = error as { code?: string; message?: string; details?: { code?: string } } | null;
  const code = failure?.details?.code ?? failure?.code;
  if (code === "INVALID_PHONE") return "/login/invalid-phone";
  if (code === "PHONE_NOT_REGISTERED") return "/login/phone-not-registered";
  if (code === "timeout") return "/login/timeout";
  if (code === "network_error" || /load failed|failed to fetch|network error|bağlantı kurulamadı/i.test(failure?.message ?? "")) return "/login/connection";
  return `/login/${stage}`;
}
