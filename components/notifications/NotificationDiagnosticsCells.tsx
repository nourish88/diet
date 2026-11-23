import { format } from "date-fns";
import { TableCell } from "@/components/ui/table";
import { diagnoseNotification, RETRY_WAIT_MS, type NotificationLog } from "@/lib/notification-log";
import { readPushDeviceInfo } from "@/lib/push-device";
import { NotificationRetry } from "./NotificationRetry";

export function NotificationDiagnosticsCells({ log }: { log: NotificationLog }) {
  const device = readPushDeviceInfo(log.deviceInfo);
  const diagnosis = diagnoseNotification(log);
  const canRetry = !log.receivedAt && (log.status === "failed" || Date.now() - Date.parse(log.sentAt) >= RETRY_WAIT_MS);
  return <>
    <TableCell className="min-w-[230px] align-top text-sm">
      <p className="font-medium">{log.subscriptionId ? `Abonelik #${log.subscriptionId}` : "Abonelik bilgisi yok"}</p>
      {device ? <div className="mt-1 space-y-1 text-muted-foreground">
        <p>{[device.os, device.osVersion].filter(Boolean).join(" ") || "İşletim sistemi bildirilmedi"}</p>
        <p>{[device.browser, device.browserVersion].filter(Boolean).join(" ") || "Tarayıcı bildirilmedi"}</p>
        <p>Model: {device.model || "Tarayıcı paylaşmadı"}</p>
        <p>Açılış: {device.standalone === null ? "Bilinmiyor" : device.standalone ? "Ana ekran uygulaması" : "Tarayıcı sekmesi"}</p>
        <p>Kayıt anındaki izin: {device.permission === "granted" ? "Açık" : device.permission === "denied" ? "Kapalı" : device.permission === "default" ? "Verilmemiş" : "Bilinmiyor"}</p>
        <p className="text-xs">Son cihaz kaydı: {format(new Date(device.capturedAt), "dd.MM.yyyy HH:mm")}</p>
        <p className="text-xs">Gönderim öncesindeki son cihaz bilgisidir; mevcut ayarlar değişmiş olabilir. Model ve sürüm bilgileri tarayıcının beyanıdır.</p>
      </div> : <p className="mt-1 text-muted-foreground">Bu gönderimde cihaz özellikleri kaydedilmemiş. Danışana hangi telefonu kullandığını sorabilirsiniz.</p>}
    </TableCell>
    <TableCell className="min-w-[250px] max-w-sm align-top text-sm">
      <p className="font-medium">{diagnosis.label}</p>
      <p className="mt-1 text-muted-foreground">{diagnosis.detail}</p>
    </TableCell>
    <TableCell className="min-w-[280px] max-w-md align-top text-sm">
      <p className="mb-2">{diagnosis.clientAdvice}</p>
      <details>
        <summary className="cursor-pointer font-medium text-brand">Kontrol adımları ({diagnosis.steps.length})</summary>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
          {diagnosis.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </details>
      {(canRetry || !!log.retries?.length) && <NotificationRetry source={log} />}
      <p className="mt-2 text-xs text-muted-foreground">Kayıt #{log.id}</p>
    </TableCell>
  </>;
}
