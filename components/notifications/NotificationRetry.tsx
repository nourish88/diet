"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { describeRequestError } from "@/lib/http-request";
import { RETRY_WAIT_MS, type DeliveryAttempt, type NotificationLog } from "@/lib/notification-log";

export type RetrySource = Pick<NotificationLog, "id" | "subscriptionId" | "receivedAt" | "retries">;
type RetryResult = { receivedAt: string | null; attempt: DeliveryAttempt | null };

export function NotificationRetry({ source }: { source: RetrySource }) {
  const latest = source.retries?.[0];
  return <RetryControl key={[source.id, source.receivedAt, latest?.id, latest?.status, latest?.receivedAt].join("/")} source={source} />;
}

function RetryControl({ source }: { source: RetrySource }) {
  const [result, setResult] = useState<RetryResult>({ receivedAt: source.receivedAt, attempt: source.retries?.[0] ?? null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const path = `/analytics/notification-logs/${source.id}/retry`;
  const { attempt, receivedAt } = result;
  const recent = !!attempt && Date.now() - Date.parse(attempt.sentAt) < RETRY_WAIT_MS;
  const waiting = recent && !receivedAt && !attempt?.receivedAt;

  useEffect(() => {
    if (!waiting || busy || error) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const next = await apiClient.get<RetryResult>(path, { signal: controller.signal });
        if (!controller.signal.aborted) setResult(next);
      } catch (err) {
        if (!controller.signal.aborted) setError(describeRequestError(err));
      }
    }, 3000);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [path, result, waiting, busy, error]);

  async function check(send: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const next = send
        ? await apiClient.post<RetryResult>(path, { previousAttemptId: attempt?.id ?? 0 })
        : await apiClient.get<RetryResult>(path);
      setResult(next);
    } catch (err) {
      setError(describeRequestError(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (!attempt && receivedAt) return <p className="text-sm">İlk bildirim telefona ulaştı.</p>;
  if (!source.subscriptionId) return <p className="text-sm">Bu eski kayıtta hangi telefona gönderildiği bilinmiyor.</p>;
  let message = "Bu telefona kısa bir deneme bildirimi gönderir.";
  if (attempt) {
    if (attempt.receivedAt) message = "Deneme bildirimi telefona ulaştı.";
    else if (attempt.status === "failed") message = "Deneme bildirimi gönderilemedi.";
    else if (attempt.status === "pending") message = recent ? "Deneme bildirimi gönderiliyor…" : "Gönderimin sonucu henüz bilinmiyor.";
    else message = recent ? "Deneme gönderildi. Telefondan yanıt bekleniyor…" : "Deneme gönderildi. Telefona ulaşıp ulaşmadığı hâlâ bilinmiyor.";
  }
  return <div className="mt-2 space-y-1 text-sm">
    <p role="status">{message}</p>
    {receivedAt && <p>İlk bildirim telefona ulaştı.</p>}
    {attempt && <p className="text-xs text-muted-foreground">Son deneme · {new Date(attempt.sentAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {!receivedAt && !attempt?.receivedAt && <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy || (waiting && !error)} onClick={() => void check(true)}>Tekrar dene</Button>
      {(attempt || error) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void check(false)}>Sonuca bak</Button>}
    </div>}
  </div>;
}
