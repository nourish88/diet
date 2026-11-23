import type { PrismaClient } from "@prisma/client";

export const logSettings = {
  diet_form_logging_enabled: { label: "Diyet formu kayıtları", description: "Diyet formunda yapılan değişiklikleri kaydeder.", defaultEnabled: false },
  application_error_logging_enabled: { label: "Hata ve giriş kayıtları", description: "Uygulama hatalarını ve danışanların giriş sorunlarını kaydeder.", defaultEnabled: true },
  notification_logging_enabled: { label: "Bildirim kayıtları", description: "Bildirimlerin gönderim ve teslim durumunu kaydeder. Hatırlatıcılar gönderilmeye devam eder.", defaultEnabled: true },
} as const;

export type LogSetting = keyof typeof logSettings;
type ConfigStore = Pick<PrismaClient, "systemConfig">;
const cache = new Map<LogSetting, { value: boolean; expires: number }>();

export function isLogSetting(key: string): key is LogSetting {
  return Object.hasOwn(logSettings, key);
}

export async function getLoggingEnabled(db: ConfigStore, key: LogSetting): Promise<boolean> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const startedAt = Date.now();
  const row = await db.systemConfig.findUnique({ where: { key }, select: { value: true } });
  const value = row ? row.value === "true" : logSettings[key].defaultEnabled;
  const current = cache.get(key);
  if (current && current !== cached) return current.value;
  cache.set(key, { value, expires: startedAt + 10_000 });
  return value;
}

export async function isLoggingEnabled(db: ConfigStore, key: LogSetting): Promise<boolean> {
  try {
    return await getLoggingEnabled(db, key);
  } catch {
    // A settings lookup failure must not create more diagnostic writes.
    return false;
  }
}

export function rememberLoggingSetting(key: LogSetting, value: boolean) {
  cache.set(key, { value, expires: Date.now() + 10_000 });
}
