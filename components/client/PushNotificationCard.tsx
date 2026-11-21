"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { setupPushNotificationsForUser, type PushSetupResult } from "@/lib/push-notifications";
import { Button } from "@/components/ui/button";

const messages: Record<NonNullable<PushSetupResult["reason"]>, string> = {
  "install-required": "iPhone/iPad’de önce uygulamayı ana ekrana ekleyin ve simgesinden açın. Ardından bildirimleri açabilirsiniz.",
  unsupported: "Bu tarayıcıda bildirimler desteklenmiyor. Diyetinize ve danışan işlemlerinize bildirimleri açmadan devam edebilirsiniz. iPhone/iPad bildirimleri için 16.4 veya üzeri gerekir.",
  denied: "Bildirim izni kapalı. Cihaz veya tarayıcı ayarlarında Diyetisyen Ezgi için bildirimlere izin verip buradan yeniden deneyin.",
  dismissed: "Öğün ve mesaj bildirimlerini almak için bu cihazda bildirimleri açın.",
  "missing-configuration": "Bildirim hizmeti şu anda hazır değil. Lütfen diyetisyeninize haber verin.",
  "missing-registration": "Uygulama hazırlanamadı. Bağlantınızı kontrol edip yeniden deneyin.",
  "missing-subscription": "Bu cihazın bildirim kaydı oluşturulamadı. Bildirimleri aç butonuna tekrar dokunun.",
};

export default function PushNotificationCard({ onReadyChange }: { onReadyChange?: (ready: boolean) => void }) {
  const { databaseUser } = useAuth();
  const userId = databaseUser?.id;
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState(messages.dismissed);
  const [unavailable, setUnavailable] = useState(false);

  const setup = useCallback(async (requestPermissionIfDefault = false, renewSubscription = false) => {
    if (!userId) return;
    setBusy(true);
    try {
      const result = await setupPushNotificationsForUser(userId, { requestPermissionIfDefault, renewSubscription });
      setReady(result.ok);
      onReadyChange?.(result.ok);
      setUnavailable(result.reason === "unsupported" || result.reason === "install-required");
      if (result.needsDeliveryCheck) {
        setMessage("Bu cihaz son üç bildirime teslim onayı vermedi. Bildirimleri göremiyorsanız aşağıdan kaydınızı yenileyin.");
      } else {
        setMessage(result.ok ? "Bu cihazın bildirim kaydı tamamlandı." : messages[result.reason ?? "missing-subscription"]);
      }
    } catch (error) {
      setReady(false);
      onReadyChange?.(false);
      setMessage(error instanceof Error ? error.message : "Bildirim kaydı tamamlanamadı. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }, [userId, onReadyChange]);

  useEffect(() => {
    void setup();
    const refresh = () => { if (document.visibilityState === "visible") void setup(); };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [setup]);

  return (
    <section aria-label="Cihaz bildirimleri" className="rounded-xl border bg-card p-4 space-y-3">
      <h2 className="font-semibold flex items-center gap-2"><Bell className="h-5 w-5" /> {ready ? "Cihaz bildirimleri" : "Bildirimleri açın"}</h2>
      <p role="status" className="text-sm text-muted-foreground">{busy ? "Cihaz bildirim kaydı kontrol ediliyor…" : message}</p>
      {!unavailable && <Button variant="outline" disabled={busy || !userId} onClick={() => setup(true, ready)}>{ready ? "Bildirim kaydını yenile" : "Bildirimleri aç"}</Button>}
    </section>
  );
}
