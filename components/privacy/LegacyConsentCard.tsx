"use client";

import { clientDestination } from "@/lib/client-return-path";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KVKK_PORTAL_CONSENT_VERSION, KVKK_PORTAL_SUMMARY_PARAGRAPHS, getKvkkInfoPageUrl } from "@/lib/kvkk-consent-config";

/** Preserve the current portal contract until the reviewed migration is enabled. */
export function LegacyConsentCard({ accepted }: { accepted: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await apiClient.post("/client/consent/kvkk", { consentVersion: KVKK_PORTAL_CONSENT_VERSION, channel: "web" });
      await queryClient.invalidateQueries({ queryKey: ["privacy-status"] });
      router.replace(clientDestination());
    } catch (e) { setError(e instanceof Error ? e.message : "Onay kaydedilemedi."); }
    finally { setBusy(false); }
  };
  return <Card className="max-w-3xl mx-auto">
    <CardHeader><CardTitle>KVKK bilgilendirmesi ve onay</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {KVKK_PORTAL_SUMMARY_PARAGRAPHS.map(text => <p key={text} className="text-sm leading-relaxed">{text}</p>)}
      <a href={getKvkkInfoPageUrl()} target="_blank" rel="noopener noreferrer" className="text-brand underline">KVKK aydınlatma metnini oku</a>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {accepted ? <><p>Mevcut onayınız kayıtlı.</p><Button asChild><Link href={clientDestination()}>Portala devam et</Link></Button></> : <>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={checked} onChange={e => setChecked(e.target.checked)} />KVKK bilgilendirmesini okudum ve sağlık verilerimin belirtilen amaçlarla işlenmesini kabul ediyorum.</label>
        <Button disabled={!checked || busy} onClick={submit}>{busy ? "Kaydediliyor…" : "Onayla ve devam et"}</Button>
      </>}
    </CardContent>
  </Card>;
}
