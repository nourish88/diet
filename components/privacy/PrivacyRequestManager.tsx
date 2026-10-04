"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PRIVACY_REQUEST_KINDS, PRIVACY_REQUEST_STATUS_LABELS } from "@/lib/kvkk-consent-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RequestRow } from "./ClientPrivacyRequests";

function RequestEditor({ request }: { request: RequestRow }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("under_review");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [verified, setVerified] = useState(false);
  const [identity, setIdentity] = useState<{ identityNumber: string; nationality: string; contactAddress: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const perform = async (action: "identity" | "reply") => {
    setBusy(true); setError(null);
    try {
      if (action === "identity") {
        const data = await apiClient.get<{ request: NonNullable<typeof identity> }>(`/privacy/requests/${request.id}`);
        setIdentity(data.request);
      } else {
        await apiClient.patch(`/privacy/requests/${request.id}`, { status, message, identityVerified: verified, completionReference: reference || undefined });
        setMessage(""); setIdentity(null);
        await queryClient.invalidateQueries({ queryKey: ["privacy-requests-management"] });
      }
    } catch (e) { setError(e instanceof Error ? e.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  };
  return <details className="border rounded-lg p-4">
    <summary className="cursor-pointer text-sm font-medium">{request.fullName} — {PRIVACY_REQUEST_KINDS[request.kind as keyof typeof PRIVACY_REQUEST_KINDS]} — {PRIVACY_REQUEST_STATUS_LABELS[request.status]}<span className={!request.respondedAt && new Date(request.dueAt) < new Date() ? "text-destructive ml-2" : "ml-2"}>Son tarih: {new Date(request.dueAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</span></summary>
    <div className="space-y-3 pt-4 text-sm">
      <p className="break-all">Başvuru: {request.id} — Alınma: {new Date(request.receivedAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p><p className="whitespace-pre-wrap">{request.detail}</p>
      <Button variant="outline" disabled={busy} onClick={() => identity ? setIdentity(null) : perform("identity")}>{identity ? "Kimlik bilgisini gizle" : "Kimlik doğrulama bilgilerini görüntüle"}</Button>
      {identity && <div className="bg-muted rounded p-3"><p>Uyruk: {identity.nationality} — Kimlik: {identity.identityNumber}</p><p>Adres: {identity.contactAddress}</p><p>Kayıtlı e-posta: {request.email}</p></div>}
      {request.events.map(event => <div key={event.id} className="border-l-2 pl-3"><p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })} — {PRIVACY_REQUEST_STATUS_LABELS[event.status]}</p><p className="whitespace-pre-wrap">{event.message}</p></div>)}
      {!request.respondedAt && <form onSubmit={e => { e.preventDefault(); perform("reply"); }} className="space-y-3">
        <label className="block">Yeni durum<select className="w-full border rounded bg-background p-2 mt-1" value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(PRIVACY_REQUEST_STATUS_LABELS).filter(([key]) => !["received", "response_accessed"].includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="block">İlgili kişiye sunulacak cevap / gerekçe<textarea required minLength={10} maxLength={10000} rows={4} className="w-full border rounded bg-background p-2" value={message} onChange={e => setMessage(e.target.value)} /></label>
        {request.kind === "erasure" && <label className="block">Gerçekleşen imha, kapsam ve alıcılara bildirim kaydı<Input value={reference} maxLength={2000} onChange={e => setReference(e.target.value)} required={status === "fulfilled"} /></label>}
        {!request.verifiedAt && <label className="flex gap-2"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />Kimliği kayıtlarla / güvenilir yöntemle doğruladım.</label>}
        <p className="text-xs text-muted-foreground">Cevap portalda ilgili kişiye sunulur. “Yerine getirildi” durumu, talebin gereğini fiilen tamamladığınızda seçilmelidir. Silme talebi otomatik veri silmez. Kimlik doğrulaması beklenmesi ilk alınma tarihini ve 30 günlük süreyi değiştirmez.</p>
        <Button type="submit" disabled={busy}>Cevabı kaydet ve ilgili kişiye sun</Button>
      </form>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  </details>;
}
export function PrivacyRequestManager() {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true); setDownloadError(null);
    try { await apiClient.download("/privacy/requests/report", "kvkk-basvuru-raporu.json"); }
    catch (e) { setDownloadError(e instanceof Error ? e.message : "Rapor indirilemedi."); }
    finally { setDownloading(false); }
  };
  const { data, isLoading, error } = useQuery({ queryKey: ["privacy-requests-management"], queryFn: () => apiClient.get<{ requests: RequestRow[]; pendingCount: number; overdueCount: number; mode?: "legacy" }>("/privacy/requests"), refetchInterval: 60000 });
  return <Card><CardHeader><CardTitle>İlgili kişi başvuruları</CardTitle>{data && <p className={data.overdueCount ? "text-destructive text-sm" : "text-sm text-muted-foreground"}>Bekleyen: {data.pendingCount} — Süresi geçen: {data.overdueCount}</p>}<Button variant="outline" disabled={downloading || !data || data.mode === "legacy"} onClick={download}>Başvuru ve cevap raporu (JSON)</Button></CardHeader><CardContent className="space-y-3">{isLoading && <p>Yükleniyor…</p>}{(error || downloadError) && <p role="alert" className="text-destructive">{downloadError ?? "Başvurular yüklenemedi."}</p>}{data?.requests.map(request => <RequestEditor key={request.id} request={request} />)}{data?.mode === "legacy" ? <p className="text-sm text-muted-foreground">Portal başvuru takibi yeni KVKK akışı etkinleştirildiğinde açılacak. Mevcut başvuru kanalları kullanılmaya devam edilir.</p> : data && !data.requests.length && <p className="text-sm text-muted-foreground">Henüz başvuru bulunmuyor.</p>}</CardContent></Card>;
}
