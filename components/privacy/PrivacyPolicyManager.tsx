"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PublishedPrivacyPolicy } from "@/lib/kvkk-consent-config";
import { buildPrivacyDocument } from "@/lib/privacy/document";

const fields = [
  ["controllerAddress", "Veri sorumlusunun tebligat adresi"],
  ["collectionMethods", "Verilerin hangi kanallardan ve yöntemlerle toplandığı"],
  ["processingDetails", "Olağan veri kategorileri, her işleme amacı ve KVKK m.5 hukuki sebepleri"],
  ["healthDataCategories", "İşlenecek sağlık verisi kategorileri"],
  ["healthPurpose", "Sağlık verilerinin belirli işleme amacı"],
  ["healthLegalJustification", "Seçilen sağlık verisi hukuki sebebinin somut gerekçesi"],
  ["recipients", "Yurt içi alıcılar, aktarım amaçları ve hukuki sebepleri"],
  ["internationalTransfers", "Yurt dışı sağlayıcılar/ülkeler, aktarım amaçları ve m.9 güvenceleri"],
  ["retentionPolicy", "Veri kategorisi başına saklama süresi, başlangıç olayı ve imha yöntemi"],
  ["refusalConsequences", "Rıza vermeme/geri çekmenin somut etkileri ve alternatif hizmet yolu"],
] as const;
type Field = typeof fields[number][0];
type PolicyForm = Record<Field | "version" | "controllerName" | "contactEmail" | "reviewReference", string> & { healthLegalBasis: "explicit_consent" | "healthcare" };
const emptyForm = { version: "2026-10-04-v2", controllerName: "", contactEmail: "", reviewReference: "", healthLegalBasis: "explicit_consent", ...Object.fromEntries(fields.map(([key]) => [key, ""])) } as PolicyForm;

export function PrivacyPolicyManager() {
  const queryClient = useQueryClient();
  const { data, error: loadError } = useQuery({ queryKey: ["privacy-policies"], queryFn: () => apiClient.get<{ policies: PublishedPrivacyPolicy[]; schemaReady: boolean; managedEnabled: boolean; requestEncryptionReady: boolean }>("/privacy/policies") });
  const [form, setForm] = useState(emptyForm);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const latest = data?.policies[0];
  const preview = buildPrivacyDocument({ ...form, reviewed: true });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      await apiClient.post("/privacy/policies", { ...form, reviewed });
      setMessage(data?.managedEnabled ? "Yeni metin sürümü yayımlandı. Danışanlara ayrı aydınlatma ve gerekiyorsa yeni açık rıza tercihi sunulacak." : "Metin sürümü hazırlık için yayımlandı. Yeni KVKK akışı etkinleştirildiğinde danışanlara sunulacak.");
      setReviewed(false);
      await queryClient.invalidateQueries({ queryKey: ["privacy-policies"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Metin yayımlanamadı."); }
    finally { setBusy(false); }
  };
  const copyLatest = () => {
    if (!latest) return;
    const { noticeText: _noticeText, consentText: _consentText, ...facts } = latest.document;
    setForm({ ...facts, healthLegalBasis: latest.healthLegalBasis, version: `${latest.version}-next`, reviewReference: "" });
    setReviewed(false);
  };
  return <Card>
    <CardHeader><CardTitle>Aydınlatma ve hukuki dayanak yönetimi</CardTitle><p className="text-sm text-muted-foreground">Yayımlanan sürümler değiştirilemez. Metin değişikliğinde yeni sürüm oluşturun. Sağlık hizmeti dayanağı, sır saklama yükümlülüğü ve faaliyet kapsamı somut olarak doğrulanmalıdır.</p></CardHeader>
    <CardContent className="space-y-4">
      {(error || loadError) && <p role="alert" className="text-destructive">{error ?? (loadError instanceof Error ? loadError.message : "Metinler yüklenemedi.")}</p>}
      {message && <p role="status" className="text-brand">{message}</p>}
      {data && !data.schemaReady && <p className="text-sm text-muted-foreground">Yeni KVKK veritabanı hazırlığı tamamlanmadı. Mevcut danışan akışı çalışmaya devam eder.</p>}
      {data?.schemaReady && !data.managedEnabled && <p className="text-sm text-muted-foreground">Yeni KVKK akışı henüz etkin değil. Burada hazırlanan metinler mevcut danışan akışını etkilemez.</p>}
      {data && !data.requestEncryptionReady && <p className="text-sm text-amber-700">Portal başvuruları için sunucuda KVKK_REQUEST_ENCRYPTION_KEY yapılandırılmalı. Diğer başvuru kanalları aydınlatma metninde açıkça bulunmalıdır.</p>}
      {latest ? <details className="border p-4 rounded"><summary className="cursor-pointer">Son yayımlanan metin: {latest.version}</summary><div className="whitespace-pre-wrap text-sm pt-4">{latest.document.noticeText}</div>{latest.document.consentText && <div className="whitespace-pre-wrap text-sm pt-4 border-t mt-4">{latest.document.consentText}</div>}<Button className="mt-4" variant="outline" onClick={copyLatest}>Yeni sürüm için bilgileri kopyala</Button></details> : data?.managedEnabled && <p className="text-sm text-amber-700">Güncel metin yayımlanana kadar portalda yeni sağlık verisi paylaşımı kapalıdır.</p>}
      <details className="border rounded p-4" open={!latest}>
        <summary className="font-medium cursor-pointer">Yeni metin sürümü oluştur</summary>
        <form onSubmit={submit} className="space-y-4 pt-4">
          {([ ["version", "Sürüm kodu"], ["controllerName", "Resmî veri sorumlusu adı/unvanı"], ["contactEmail", "Başvuru e-posta adresi"], ["reviewReference", "Hukuki incelemeyi yapan kişi / belge ve tarih referansı"] ] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<Input required type={key === "contactEmail" ? "email" : "text"} value={form[key]} maxLength={key === "version" ? 80 : 500} onChange={e => { setReviewed(false); setForm({ ...form, [key]: e.target.value }); }} /></label>)}
          <label className="block text-sm">Sağlık verisi hukuki sebebi<select className="w-full border rounded bg-background p-2 mt-1" value={form.healthLegalBasis} onChange={e => { setReviewed(false); setForm({ ...form, healthLegalBasis: e.target.value as PolicyForm["healthLegalBasis"] }); }}><option value="explicit_consent">KVKK m.6/3(a) — Açık rıza</option><option value="healthcare">KVKK m.6/3(e) — Yetkili / sır saklama yükümlüsü sağlık hizmeti</option></select></label>
          {fields.map(([key, label]) => <label key={key} className="block text-sm">{label}<textarea required minLength={10} maxLength={10000} rows={3} className="block w-full border rounded-md bg-background p-2 mt-1" value={form[key]} onChange={e => { setReviewed(false); setForm({ ...form, [key]: e.target.value }); }} /></label>)}
          <p className="text-xs text-muted-foreground">Rızayı hizmetin genel koşulu yapmayın. Olağan veri işleme, sağlık verisi, pazarlama ve aktarım dayanaklarını faaliyet bazında değerlendirin. Düzenli yurt dışı aktarım için bu açık rıza metni tek başına yeterli değildir.</p>
          <details className="border rounded p-4"><summary className="cursor-pointer font-medium">Danışana sunulacak metinleri önizle</summary><div className="whitespace-pre-wrap text-sm pt-4">{preview.noticeText}</div>{preview.consentText && <div className="whitespace-pre-wrap text-sm mt-4 pt-4 border-t">{preview.consentText}</div>}</details>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="mt-1" />Veri sorumlusu bilgilerini, veri envanterini, hukuki dayanakları, alıcıları ve saklama sürelerini doğruladım; metni hukuken inceledim / incelettim. Yayımlama sorumluluğunu üstleniyorum.</label>
          <Button type="submit" disabled={!data?.schemaReady || !reviewed || busy}>Yeni sürümü yayımla</Button>
        </form>
      </details>
      {!!data?.policies.length && <p className="text-xs text-muted-foreground">Son {data.policies.length} metin sürümü listelendi (en fazla 100). Kabul edilen metin kopyaları ve inceleme referansları JSON kanıt raporunda yer alır.</p>}
    </CardContent>
  </Card>;
}
