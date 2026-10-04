"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PRIVACY_ACTION_LABELS } from "@/lib/kvkk-consent-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ConsentRow { id: number; clientId: number; clientName: string; action: string; consentVersion: string; acceptedAt: string; channel: string; evidenceStatus: string; }
export function ConsentAudit({ clientId }: { clientId?: number }) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const endpoint = clientId ? `/clients/${clientId}/consents` : "/consents";
  const filters = new URLSearchParams();
  if (search) filters.set("search", search);
  if (from) filters.set("from", new Date(`${from}T00:00:00+03:00`).toISOString());
  if (to) filters.set("to", new Date(`${to}T23:59:59.999+03:00`).toISOString());
  const { data, isLoading, error } = useQuery({
    queryKey: ["privacy-consent-audit", clientId, search, from, to, page],
    queryFn: () => apiClient.get<{ records: ConsentRow[]; total: number; pageSize: number; mode?: "legacy" }>(`${endpoint}?${filters}&page=${page}`),
  });
  const download = async (format: "csv" | "json") => {
    setDownloading(true); setDownloadError(null);
    try { const params = new URLSearchParams(filters); params.set("format", format); await apiClient.download(`${endpoint}?${params}`, `kvkk-${clientId ?? "tum-danisanlar"}.${format}`); }
    catch (e) { setDownloadError(e instanceof Error ? e.message : "Rapor indirilemedi."); }
    finally { setDownloading(false); }
  };
  return <Card>
    <CardHeader><CardTitle>Aydınlatma ve açık rıza denetim kayıtları</CardTitle>
      <p className="text-sm text-muted-foreground">Her satır ayrı bir işlemdir. {data?.mode === "legacy" ? "Mevcut birleşik onay kayıtları gösterilir; bu kayıtların metin kopyası ve bütünlük zinciri bulunmaz." : "Yeni akışta raporlar metin kopyalarını, sürümleri, UTC zamanlarını ve bütünlük özetlerini içerir. Eski birleşik onayların metin kopyası bulunmaz."}</p>
      <div className="flex flex-wrap items-end gap-3 pt-3">
        {!clientId && <label className="text-sm">Danışan<Input value={search} maxLength={200} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Ad veya soyad" /></label>}
        <label className="text-sm">Başlangıç (İstanbul)<Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="text-sm">Bitiş (İstanbul)<Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></label>
        <Button variant="outline" disabled={downloading} onClick={() => download("csv")}>CSV indir</Button>
        <Button variant="outline" disabled={downloading} onClick={() => download("json")}>Kanıt dosyası (JSON)</Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {isLoading && <p>Yükleniyor…</p>}
      {(error || downloadError) && <p role="alert" className="text-destructive">{downloadError ?? (error instanceof Error ? error.message : "Kayıtlar yüklenemedi.")}</p>}
      {data && <>
        <p className="text-sm text-muted-foreground">Toplam {data.total} işlem</p>
        <div className="overflow-x-auto border rounded-md"><Table>
          <TableHeader><TableRow><TableHead>Tarih (İstanbul)</TableHead>{!clientId && <TableHead>Danışan</TableHead>}<TableHead>İşlem</TableHead><TableHead>Sürüm</TableHead><TableHead>Kanal</TableHead><TableHead>Bütünlük</TableHead></TableRow></TableHeader>
          <TableBody>{data.records.map(row => <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap">{new Date(row.acceptedAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</TableCell>
            {!clientId && <TableCell><Link className="text-brand underline" href={`/clients/${row.clientId}/kvkk`}>{row.clientName}</Link></TableCell>}
            <TableCell>{PRIVACY_ACTION_LABELS[row.action] ?? row.action}</TableCell><TableCell>{row.consentVersion}</TableCell><TableCell>{row.channel}</TableCell>
            <TableCell className={row.evidenceStatus === "integrity_mismatch" ? "text-destructive" : ""}>{row.evidenceStatus === "hash_verified" ? "Özet doğrulandı" : row.evidenceStatus === "integrity_mismatch" ? "Uyuşmazlık" : "Eski kayıt / metin yok"}</TableCell>
          </TableRow>)}</TableBody>
        </Table></div>
        <div className="flex gap-3 items-center"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Önceki</Button><span className="text-sm">Sayfa {page}</span><Button variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Sonraki</Button></div>
      </>}
    </CardContent>
  </Card>;
}
