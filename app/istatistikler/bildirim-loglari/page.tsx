"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BellRing } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { NotificationLogsTable } from "@/components/notifications/NotificationLogsTable";
import { Button } from "@/components/ui/button";
import type { NotificationLog } from "@/lib/notification-log";

export default function BildirimLoglariPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<{ ok: boolean; logs: NotificationLog[] }>({
    queryKey: ["notificationLogs"],
    queryFn: () => apiClient.get("/analytics/notification-logs"),
    staleTime: 60 * 1000,
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1800px]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <BellRing className="h-8 w-8 text-brand" /> Bildirim Geçmişi
        </h1>
        <p className="text-muted-foreground mt-2">
          Öğün ve test bildirimlerinin hedef cihazları, teslim durumu ve kontrol adımları.
        </p>
      </div>
      {isError ? (
        <div role="alert" className="rounded-xl border p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-destructive" />
          <p className="mb-4 text-destructive">{error instanceof Error ? error.message : "Veriler alınamadı."}</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>Tekrar dene</Button>
        </div>
      ) : (
        <NotificationLogsTable
          logs={data?.logs ?? []}
          isLoading={isLoading}
          isRefreshing={isRefetching}
          onRefresh={() => { void refetch(); }}
          description="Son 100 öğün hatırlatıcısı ve test bildirimi"
        />
      )}
    </div>
  );
}
