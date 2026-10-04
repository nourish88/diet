"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIVACY_ACTION_LABELS, type PrivacyStatus } from "@/lib/kvkk-consent-config";
import { ClientPrivacyRequests } from "@/components/privacy/ClientPrivacyRequests";
import { LegacyConsentCard } from "@/components/privacy/LegacyConsentCard";

type Decision = "notice_acknowledged" | "granted" | "declined" | "withdrawn";
interface RecordRow { id: number; action: string; consentVersion: string; acceptedAt: string; eventHash: string | null; }

export default function ClientKvkkOnayPage() {
  const queryClient = useQueryClient();
  const [noticeRead, setNoticeRead] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [withdrawChecked, setWithdrawChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: Decision; policyId: string; requestId: string } | null>(null);
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["privacy-status"], queryFn: () => apiClient.get<PrivacyStatus & { records: RecordRow[] }>("/client/consent/kvkk"),
  });
  const policy = data?.policy;
  useEffect(() => {
    setNoticeRead(false); setConsentChecked(false); setWithdrawChecked(false); setPending(null);
  }, [policy?.id]);
  const submit = async (action: Decision) => {
    if (!policy) return;
    const retry = pending?.action === action && pending.policyId === policy.id ? pending : { action, policyId: policy.id, requestId: crypto.randomUUID() };
    setPending(retry); setBusy(true); setError(null); setMessage(null);
    try {
      await apiClient.post("/client/consent/kvkk", { ...retry, documentHash: policy.documentHash, affirmed: true, channel: "web" });
      setPending(null); setConsentChecked(false); setWithdrawChecked(false);
      setMessage("Tercihiniz tarih ve metin sürümüyle kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["privacy-status"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Tercih kaydedilemedi."); }
    finally { setBusy(false); }
  };
  if (data?.mode === "legacy") return <LegacyConsentCard accepted={data.noticeAcknowledged} />;
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">KVKK ve haklarım</h1>
      {isLoading && <p>Bilgiler yükleniyor…</p>}
      {(error || loadError) && <p role="alert" className="text-destructive">{error ?? "KVKK bilgileri yüklenemedi."}</p>}
      {message && <p role="status" className="text-brand">{message}</p>}
      {data && !policy && <Card><CardContent className="pt-6">Veri sorumlusu henüz güncel aydınlatma metnini yayımlamadı. Yeni sağlık verisi paylaşımı açılmadan önce diyetisyeninizle iletişime geçin. Haklarınıza ilişkin başvuru yapabilirsiniz.</CardContent></Card>}
      {policy && <>
        <Card>
          <CardHeader><CardTitle>Aydınlatma metni</CardTitle><p className="text-sm text-muted-foreground">Sürüm: {policy.version}</p></CardHeader>
          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{policy.document.noticeText}</div>
            {data?.noticeAcknowledged ? <p className="text-brand">Bu sürümün aydınlatma kaydı mevcut.</p> : <>
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={noticeRead} onChange={e => setNoticeRead(e.target.checked)} className="mt-1" />Aydınlatma metnini okudum. Bu işlem açık rıza vermez.</label>
              <Button disabled={!noticeRead || busy} onClick={() => submit("notice_acknowledged")}>Okuduğumu kaydet</Button>
            </>}
          </CardContent>
        </Card>
        {policy.healthLegalBasis === "explicit_consent" ? <Card>
          <CardHeader><CardTitle>Sağlık verisi için açık rıza tercihi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{policy.document.consentText}</div>
            <p className="text-sm">Mevcut tercih: {data?.healthConsent ? PRIVACY_ACTION_LABELS[data.healthConsent] : "Henüz tercih yapılmadı"}</p>
            {data?.healthConsent === "granted" ? <>
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={withdrawChecked} onChange={e => setWithdrawChecked(e.target.checked)} className="mt-1" />Sağlık verilerim için verdiğim açık rızayı geri çekmek istiyorum.</label>
              <Button variant="outline" disabled={!withdrawChecked || busy} onClick={() => submit("withdrawn")}>Rızamı geri çek</Button>
            </> : <>
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} className="mt-1" />Yukarıdaki amaç ve veri kategorileri için özgür irademle açık rıza veriyorum.</label>
              <div className="flex flex-wrap gap-3">
                <Button disabled={!consentChecked || !data?.noticeAcknowledged || busy} onClick={() => submit("granted")}>Açık rıza veriyorum</Button>
                <Button variant="outline" disabled={!data?.noticeAcknowledged || busy} onClick={() => submit("declined")}>Rıza vermiyorum</Button>
              </div>
            </>}
          </CardContent>
        </Card> : <Card><CardContent className="pt-6 text-sm">Sağlık verilerinin işlenmesi, aydınlatma metninde açıklanan KVKK m.6/3(e) hukuki sebebine dayanır. Bu faaliyet için açık rıza istenmez. Haklarınıza ilişkin başvurularınızı aşağıdan iletebilirsiniz.</CardContent></Card>}
        {data?.noticeAcknowledged && <Button asChild variant="outline"><Link href="/client">Portala devam et</Link></Button>}
      </>}
      <ClientPrivacyRequests contactEmail={policy?.document.contactEmail} controllerAddress={policy?.document.controllerAddress} />
      {!!data?.records.length && <Card>
        <CardHeader><CardTitle>Tercih geçmişim</CardTitle><p className="text-sm text-muted-foreground">Son 100 işlem gösterilir. Önceki kayıtlar için veri sorumlusundan kayıt talep edebilirsiniz.</p></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data.records.map(record => <div key={record.id} className="border-b pb-3">
            <p>{PRIVACY_ACTION_LABELS[record.action] ?? record.action} — {record.consentVersion}</p>
            <time>{new Date(record.acceptedAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</time>
            {!record.eventHash && <p className="text-muted-foreground">Eski kaydın kabul edilen metin kopyası mevcut değil.</p>}
          </div>)}
        </CardContent>
      </Card>}
    </div>
  );
}
