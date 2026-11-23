import { z } from "zod";

export const errorCodes = ["network_error", "timeout", "http_error", "auth_failed", "database_connection", "database_query", "push_failed", "delivery_unconfirmed", "javascript_error", "pdf_failed", "invalid_response", "job_failed"] as const;
export type ApplicationErrorCode = typeof errorCodes[number];
export const errorMessages: Record<ApplicationErrorCode, string> = {
  network_error: "Sunucuya bağlantı kurulamadı.", timeout: "İstek zaman aşımına uğradı.",
  http_error: "Sunucu isteği tamamlayamadı.", auth_failed: "Oturum veya hesap erişimi doğrulanamadı.",
  database_connection: "PostgreSQL bağlantısı kurulamadı veya kapandı.", database_query: "Veritabanı işlemi tamamlanamadı.",
  push_failed: "Bildirim gönderimi veya cihaz kaydı tamamlanamadı.",
  delivery_unconfirmed: "Gönderim kabul edildi; 15 dakika içinde cihaz teslim onayı alınamadı. Kesin teslim durumu bilinmiyor.",
  javascript_error: "Tarayıcıda uygulama hatası oluştu.", pdf_failed: "Diyet PDF dosyası oluşturulamadı.",
  invalid_response: "Sunucudan geçerli bir yanıt alınamadı.", job_failed: "Zamanlanmış görev tamamlanamadı.",
};

export function errorPath(value: string): string {
  try {
    const path = new URL(value, "https://local.invalid").pathname;
    // No query strings, shared-link tokens, phone numbers or dynamic identifiers.
    return path.split("/").map((part) => /^[a-z][a-z-]{0,35}$/i.test(part) ? part : part ? ":id" : "").join("/").slice(0, 180);
  } catch { return "/"; }
}

export const ClientErrorSchema = z.object({
  eventId: z.string().uuid(), code: z.enum(errorCodes), path: z.string().max(180),
  occurredAt: z.string().datetime(), status: z.number().int().min(400).max(599).optional(),
  recoveredAt: z.string().datetime().optional(),
  loginLogToken: z.string().max(125).optional(),
  subject: z.string().uuid().nullable().optional(),
  // Only the public build hash and generated line/column may leave the browser.
  bundlePosition: z.string().regex(/^[a-f0-9]{16}:[1-9]\d{0,7}:[1-9]\d{0,7}$/).optional(),
}).strict();
export type ClientErrorEvent = z.infer<typeof ClientErrorSchema>;

const recoveryMethods: ReadonlyMap<string, string> = new Map([
  ["/api/client/portal/notifications", "GET"],
  ["/api/notifications/check-meal-reminders", "GET"],
  ["/api/push/subscribe", "POST"],
  ["/api/diets/:id/track", "POST"],
]);

// Recovery is reported when the user completes the same type of operation again.
export function tracksRecovery(path: string, method: string) {
  return recoveryMethods.get(path) === method;
}

export function canReportRecovery(path: string, code: ApplicationErrorCode) {
  return (code === "timeout" || code === "network_error") && recoveryMethods.has(path);
}

export function classifyError(error: unknown, fallback: ApplicationErrorCode = "http_error"): ApplicationErrorCode {
  const value = error as { code?: string; message?: string; status?: number } | null;
  if (value?.code && errorCodes.includes(value.code as ApplicationErrorCode)) return value.code as ApplicationErrorCode;
  if (/^P(100[012]|1017|2024)$/.test(value?.code ?? "") || /connection.*closed|kind: Closed|server has closed|can't reach database/i.test(value?.message ?? "")) return "database_connection";
  if (/^P\d{4}$/.test(value?.code ?? "")) return "database_query";
  if (/load failed|failed to fetch|networkerror|network request failed|fetch failed/i.test(value?.message ?? "")) return "network_error";
  return fallback;
}
