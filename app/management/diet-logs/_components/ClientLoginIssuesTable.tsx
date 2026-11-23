"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api-client";
import { describeRequestError } from "@/lib/http-request";

interface LoginIssue {
  id: string;
  occurredAt: string;
  label: string;
  advice: string;
  clientName: string | null;
}

interface LoginIssuesResponse {
  enabled: boolean;
  incidents: LoginIssue[];
}

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export function ClientLoginIssuesTable({ enabled }: { enabled?: boolean }) {
  const [result, setResult] = useState<LoginIssuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get<LoginIssuesResponse>("/application-errors?view=client-login", { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setResult(data); })
      .catch((err) => { if (!controller.signal.aborted) setError(describeRequestError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [version]);

  function refresh() {
    setLoading(true);
    setError("");
    setVersion((current) => current + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Son 24 saatte bildirilen en yeni 30 giriş sorunu.</p>
        <Button variant="outline" disabled={loading} onClick={refresh}>Yenile</Button>
      </div>
      {(enabled ?? result?.enabled) === false && (
        <p role="status" className="text-sm text-muted-foreground">Hata ve giriş kayıtları ayarı kapalı. Yeni sorunlar kaydedilmiyor.</p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && !result && <p role="status" className="text-sm">Giriş sorunları yükleniyor…</p>}
      {result && (result.incidents.length === 0 ? (
        <p className="text-sm">Son 24 saatte giriş sorunu kaydedilmedi.</p>
      ) : (
        <Table aria-label="Danışan giriş sorunları" aria-busy={loading}>
          <TableHeader>
            <TableRow>
              <TableHead>Olay zamanı</TableHead>
              <TableHead>Danışan</TableHead>
              <TableHead>Giriş sorunu</TableHead>
              <TableHead>Danışana öneri</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.incidents.map((incident) => (
              <TableRow key={incident.id} className="align-top">
                <TableCell className="whitespace-nowrap">{dateTime.format(new Date(incident.occurredAt))}</TableCell>
                <TableCell>{incident.clientName ?? "Danışan belirlenemedi"}</TableCell>
                <TableCell className="min-w-48">{incident.label}</TableCell>
                <TableCell className="min-w-56">{incident.advice}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ))}
    </div>
  );
}
