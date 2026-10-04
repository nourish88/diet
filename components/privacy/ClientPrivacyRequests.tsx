"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PRIVACY_REQUEST_KINDS, PRIVACY_REQUEST_STATUS_LABELS } from "@/lib/kvkk-consent-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface RequestRow {
  id: string; clientId?: number; kind: string; fullName?: string; email?: string; detail: string;
  receivedAt: string; dueAt: string; status: string; verifiedAt?: string | null; respondedAt: string | null;
  events: { id: string; status: string; message: string; createdAt: string }[];
}
export function ClientPrivacyRequests({ contactEmail, controllerAddress }: { contactEmail?: string; controllerAddress?: string }) {
  const queryClient = useQueryClient();
  const { data, error: loadError } = useQuery({ queryKey: ["privacy-own-requests"], queryFn: () => apiClient.get<{ requests: RequestRow[]; requestEncryptionReady: boolean }>("/client/privacy/requests") });
  const [form, setForm] = useState({ kind: "information", fullName: "", nationality: "TR", identityNumber: "", contactAddress: "", detail: "" });
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    const id = requestId ?? crypto.randomUUID(); setRequestId(id);
    try {
      const response = await apiClient.post<{ request: { id: string } }>("/client/privacy/requests", { ...form, requestId: id });
      setReceipt(response.request.id); setRequestId(null);
      setForm(current => ({ ...current, identityNumber: "", detail: "" }));
      await queryClient.invalidateQueries({ queryKey: ["privacy-own-requests"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Başvuru alınamadı."); }
    finally { setBusy(false); }
  };
  return <Card>
    <CardHeader><CardTitle>Haklarıma ilişkin başvuru</CardTitle><p className="text-sm text-muted-foreground">Başvurular en kısa sürede ve en geç 30 gün içinde cevaplanır. Kimliğiniz doğrulanmadan verileriniz üçüncü kişilere açıklanmaz.</p></CardHeader>
    <CardContent className="space-y-5">
      {contactEmail && <p className="text-sm">Kayıtlı e-posta adresinizden <a className="text-brand underline" href={`mailto:${contactEmail}`}>{contactEmail}</a> adresine veya yazılı olarak {controllerAddress} adresine de başvurabilirsiniz.</p>}
      {data?.requestEncryptionReady ? <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">Talep türü<select className="w-full mt-1 border rounded-md bg-background p-2" value={form.kind} onChange={e => { setRequestId(null); setForm({ ...form, kind: e.target.value }); }}>{Object.entries(PRIVACY_REQUEST_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        {([ ["fullName", "Ad ve soyad"], ["nationality", "Uyruk (Türkiye için TR)"], ["identityNumber", "T.C. kimlik / pasaport / yabancı kimlik numarası"], ["contactAddress", "Tebligat adresi"] ] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<Input required autoComplete={key === "identityNumber" ? "off" : undefined} maxLength={key === "identityNumber" ? 30 : 300} value={form[key]} onChange={e => { setRequestId(null); setForm({ ...form, [key]: e.target.value }); }} /></label>)}
        <label className="block text-sm">Talep konusu<textarea required minLength={10} maxLength={5000} rows={4} className="w-full border rounded-md bg-background p-2" value={form.detail} onChange={e => { setRequestId(null); setForm({ ...form, detail: e.target.value }); }} /></label>
        <p className="text-xs text-muted-foreground">Kimlik numarası şifreli saklanır; yalnızca yetkili veri sorumlusu doğrulama için görüntüleyebilir. Gereksiz sağlık bilgisi veya belge eklemeyin. Cevabınız bu ekranda sunulur.</p>
        <Button disabled={busy} type="submit">Başvurumu ilet</Button>
      </form> : data && <p className="text-sm">Portal başvuru kanalı henüz açılmadı. Diğer başvuru yollarını kullanabilirsiniz.</p>}
      {(error || loadError) && <p role="alert" className="text-destructive">{error ?? "Başvurular yüklenemedi."}</p>}
      {receipt && <p role="status" className="text-brand break-all">Başvurunuz alındı. Başvuru kimliği: {receipt}</p>}
      {data?.requests.map(request => <article key={request.id} className="border rounded-lg p-4 space-y-2 text-sm">
        <p className="font-medium">{PRIVACY_REQUEST_KINDS[request.kind as keyof typeof PRIVACY_REQUEST_KINDS]}</p>
        <p>{PRIVACY_REQUEST_STATUS_LABELS[request.status]} — Son cevap tarihi: {new Date(request.dueAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>
        <p className="text-xs break-all">Başvuru kimliği: {request.id}</p>
        <p className="whitespace-pre-wrap">{request.detail}</p>
        {request.events.map(event => <div key={event.id} className="bg-muted rounded p-3"><p className="text-xs">{new Date(event.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })} — {PRIVACY_REQUEST_STATUS_LABELS[event.status]}</p><p className="whitespace-pre-wrap mt-1">{event.message}</p></div>)}
      </article>)}
    </CardContent>
  </Card>;
}
