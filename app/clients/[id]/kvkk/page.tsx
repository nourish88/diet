"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Download, Loader2, Shield } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface ConsentRecord {
  id: number;
  consentVersion: string;
  consentType: string;
  acceptedAt: string;
  channel: string;
  userAgent: string | null;
  ipHash: string | null;
  userId: number;
}

export default function ClientKvkkAuditPage() {
  const params = useParams();
  const clientId = params?.id ? Number(params.id) : NaN;

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-consents", clientId],
    queryFn: async () => {
      const res = await apiClient.get<{ records: ConsentRecord[] }>(
        `/clients/${clientId}/consents`
      );
      return res.records;
    },
    enabled: Number.isFinite(clientId),
  });

  const formatDt = (iso: string) => {
    try {
      return format(parseISO(iso), "d MMM yyyy HH:mm", { locale: tr });
    } catch {
      return iso;
    }
  };

  if (!Number.isFinite(clientId)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/clients/${clientId}`}
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Danışan detayına dön
        </Link>
        <a
          href={`/api/clients/${clientId}/consents?format=csv`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV indir
          </Button>
        </a>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            <CardTitle>KVKK / portal açık rıza kayıtları</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Danışanın uygulama üzerinden verdiği onayların denetim listesi. Yasal
            süreçlerde kanıt amacıyla saklanır.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-gray-600">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              Yükleniyor…
            </div>
          )}
          {error && (
            <p className="text-red-600 text-center py-8">
              Kayıtlar yüklenemedi. Yetkinizi kontrol edin.
            </p>
          )}
          {!isLoading && data && data.length === 0 && (
            <p className="text-center text-gray-600 py-8">
              Henüz kayıtlı portal onayı yok.
            </p>
          )}
          {!isLoading && data && data.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih / saat</TableHead>
                    <TableHead>Sürüm</TableHead>
                    <TableHead>Kanal</TableHead>
                    <TableHead>Kullanıcı ID</TableHead>
                    <TableHead>IP özeti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDt(r.acceptedAt)}
                      </TableCell>
                      <TableCell>{r.consentVersion}</TableCell>
                      <TableCell>{r.channel}</TableCell>
                      <TableCell>{r.userId}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {r.ipHash ? `${r.ipHash.slice(0, 12)}…` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
