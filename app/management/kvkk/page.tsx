"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Download, Loader2, Search, Shield } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface ConsentRecord {
  id: number;
  clientId: number;
  clientName: string;
  consentVersion: string;
  consentType: string;
  acceptedAt: string;
  channel: string;
  userAgent: string | null;
  ipHash: string | null;
  userId: number;
}

export default function KvkkAuditPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["consents-audit", search],
    queryFn: async () => {
      const res = await apiClient.get<{ records: ConsentRecord[] }>(
        `/consents${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      );
      return res.records;
    },
  });

  const csvHref = useMemo(() => {
    const qs = new URLSearchParams({ format: "csv" });
    if (search) qs.set("search", search);
    return `/api/consents?${qs.toString()}`;
  }, [search]);

  const formatDt = (iso: string) => {
    try {
      return format(parseISO(iso), "d MMM yyyy HH:mm", { locale: tr });
    } catch {
      return iso;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/"
          className="text-brand hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Ana sayfaya dön
        </Link>
        <a href={csvHref} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV indir
          </Button>
        </a>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand" />
            <CardTitle>KVKK / açık rıza kayıtları</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Tüm danışanların uygulama üzerinden verdiği onayların denetim günlüğü.
            Her satır ayrı bir onay kaydıdır; yasal süreçlerde kanıt amacıyla
            saklanır.
          </p>
          <div className="relative mt-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Danışan adına göre ara…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              Yükleniyor…
            </div>
          )}
          {error && (
            <p className="text-destructive text-center py-8">
              Kayıtlar yüklenemedi. Yetkinizi kontrol edin.
            </p>
          )}
          {!isLoading && data && data.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {search
                ? "Aramanızla eşleşen kayıt bulunamadı."
                : "Henüz kayıtlı açık rıza onayı yok."}
            </p>
          )}
          {!isLoading && data && data.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Toplam {data.length} kayıt
              </p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih / saat</TableHead>
                      <TableHead>Danışan</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>Sürüm</TableHead>
                      <TableHead>Kanal</TableHead>
                      <TableHead>IP özeti</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDt(r.acceptedAt)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/clients/${r.clientId}/kvkk`}
                            className="text-brand hover:underline"
                          >
                            {r.clientName || `#${r.clientId}`}
                          </Link>
                        </TableCell>
                        <TableCell>{r.consentType}</TableCell>
                        <TableCell>{r.consentVersion}</TableCell>
                        <TableCell>{r.channel}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">
                          {r.ipHash ? `${r.ipHash.slice(0, 12)}…` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
