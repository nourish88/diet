"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BellRing, CheckCircle2, AlertCircle, RefreshCw, Info } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { Button } from "@/components/ui/button";

interface NotificationLog {
  id: number;
  type: string;
  title: string | null;
  body: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string;
  client: {
    name: string;
    surname: string;
  };
  ogun: {
    name: string;
    time: string;
  } | null;
}

export default function BildirimLoglariPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<{ ok: boolean; logs: NotificationLog[] }>({
    queryKey: ['notificationLogs'],
    queryFn: () => apiClient.get("/analytics/notification-logs"),
    staleTime: 60 * 1000, // 1 minute
  });

  const logs = data?.logs || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BellRing className="h-8 w-8 text-indigo-600" />
            Bildirim Geçmişi
          </h1>
          <p className="text-muted-foreground mt-2">
            Son 3 güne ait öğün hatırlatıcısı ve test bildirimlerinin gönderim durumları (Eski kayıtlar otomatik silinir).
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isRefetching || isLoading} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg">Gönderilen Bildirimler</CardTitle>
          <CardDescription>Bildirimlerin cihazlara ulaşıp ulaşmadığını gösterir.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-muted-foreground">Loglar yükleniyor...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-16 px-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Hata Oluştu</h3>
              <p className="text-red-600 mb-4">{error instanceof Error ? error.message : 'Veriler alınamadı.'}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 px-4 bg-muted/30">
              <Info className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Henüz Kayıt Yok</h3>
              <p className="text-muted-foreground">Son 3 gün içinde gönderilmiş bir bildirim bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-card border-b text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tarih / Saat</th>
                    <th className="px-6 py-4 font-medium">Danışan</th>
                    <th className="px-6 py-4 font-medium">Öğün</th>
                    <th className="px-6 py-4 font-medium">Tür</th>
                    <th className="px-6 py-4 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(log.sentAt), "dd MMM yyyy, HH:mm", { locale: tr })}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {log.client.name} {log.client.surname}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {log.ogun ? `${log.ogun.name} (${log.ogun.time})` : '-'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {log.type === "meal_reminder" ? "Otomatik Öğün" : log.type === "manual_test" ? "Manuel Test" : log.type}
                      </td>
                      <td className="px-6 py-4">
                        {log.status === "success" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Başarılı
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 w-fit">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Hata
                            </span>
                            <span className="text-[10px] text-red-600 max-w-[200px] truncate" title={log.errorMessage || "Bilinmeyen hata"}>
                              {log.errorMessage || "Bilinmeyen hata"}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
