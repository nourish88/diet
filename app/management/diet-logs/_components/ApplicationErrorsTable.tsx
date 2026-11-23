"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { errorCodes, type ApplicationErrorCode } from "@/lib/application-errors";
import { applicationErrorAdvice, errorHeadings } from "@/lib/client-log-advice";
import { describeRequestError } from "@/lib/http-request";
import { Button } from "@/components/ui/button";
import { NotificationRetry, type RetrySource } from "@/components/notifications/NotificationRetry";

interface ErrorRow { id: string; code: string; message: string; source: string; path: string; status: number | null; device: string | null; referenceId: number | null; occurredAt: string; createdAt: string; recoveredAt: string | null; notification: RetrySource | null }
export function ApplicationErrorsTable() {
  const [code, setCode] = useState("");
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    apiClient.get<{ errors: ErrorRow[]; total: number }>(`/application-errors?code=${code}&page=${page}`, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) { setRows(data.errors); setTotal(data.total); } })
      .catch((err) => { if (!controller.signal.aborted) setError(describeRequestError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [code, page, version]);
  const time = (value: string) => new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Son 90 günde yaşanan sorunlar ve cihaza ulaşıp ulaşmadığı bilinmeyen bildirimler burada görünür. İnternet kesildiyse sorun listeye daha sonra eklenebilir.</p>
    <div className="flex flex-wrap gap-3 items-center">
      <select aria-label="Hata türü" className="border rounded p-2 bg-background max-w-full" value={code} onChange={(event) => { setCode(event.target.value); setPage(0); }}>
        <option value="">Tüm hata türleri</option>{errorCodes.map((value) => <option value={value} key={value}>{errorHeadings[value]}</option>)}
      </select>
      <Button variant="outline" disabled={loading} onClick={() => setVersion((value) => value + 1)}>Yenile</Button>
      <span className="text-sm">{total} kayıt</span>
    </div>
    {error ? <p role="alert" className="text-destructive">{error}</p> : loading ? <p>Hatalar yükleniyor…</p> : <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="text-left border-b"><th className="p-2">Olay zamanı</th><th className="p-2">Hata</th><th className="p-2">Danışana öneri</th><th className="p-2">İşlem</th><th className="p-2">Cihaz / kaynak</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} className="border-b align-top">
        <td className="p-2 whitespace-nowrap">{time(row.occurredAt)}<span className="block text-xs text-muted-foreground">Kayıt: {time(row.createdAt)}</span></td>
        <td className="p-2 min-w-64">
          {Object.hasOwn(errorHeadings, row.code) ? errorHeadings[row.code as ApplicationErrorCode] : row.message}
          {row.referenceId && <span className="block text-xs text-muted-foreground">Bildirim #{row.referenceId}</span>}
          <details className="mt-1 text-xs text-muted-foreground">
            <summary className="cursor-pointer">Teknik ayrıntılar</summary>
            <p>{row.message} ({row.code}{row.status ? ` · HTTP ${row.status}` : ""})</p>
          </details>
        </td>
        <td className="p-2 min-w-64">
          {row.recoveredAt ? <p>Bu cihazda aynı tür işlem daha sonra başarıyla tamamlandı. {time(row.recoveredAt)}</p> : applicationErrorAdvice(row.code, row.path)}
          {row.notification ? <NotificationRetry source={row.notification} /> :
            !row.recoveredAt && <p className="mt-2 text-xs text-muted-foreground">{row.source === "client" ? "Bu işlem, sorunun yaşandığı cihazda tekrar denenebilir." : "Bu kayıttan yeni bir deneme başlatılamıyor."}</p>}
        </td>
        <td className="p-2">{row.path}</td><td className="p-2">{row.device || (row.source === "client" ? "Tarayıcı" : "Sunucu")}</td>
      </tr>)}{!rows.length && <tr><td colSpan={5} className="p-4">Bu filtrede hata kaydı yok.</td></tr>}</tbody>
    </table></div>}
    <div className="flex gap-3 items-center"><Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>Önceki</Button><span>{page + 1}</span><Button variant="outline" disabled={(page + 1) * 50 >= total || loading} onClick={() => setPage((value) => value + 1)}>Sonraki</Button></div>
  </div>;
}
