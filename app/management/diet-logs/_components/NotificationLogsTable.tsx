import { format } from "date-fns";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NotificationLog } from "./types";

const DEVICE_ACK_TRACKING_STARTED_AT = new Date("2026-06-04T22:00:00.000Z");

interface NotificationLogsTableProps {
  isLoading: boolean;
  logs: NotificationLog[];
  onRefresh: () => void;
}

function formatNotificationType(type: string) {
  const typeMap: Record<string, string> = {
    meal_reminder: "30 dk öncesi",
    meal_time: "Öğün vakti",
    manual_test: "Manuel Test",
  };
  return typeMap[type] || type;
}

function ServerStatus({ log }: { log: NotificationLog }) {
  if (log.status === "success") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        Gönderildi
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge className="bg-red-100 text-red-800 border-red-300">
        <AlertCircle className="h-3.5 w-3.5 mr-1" />
        Hata
      </Badge>
      <span
        className="text-xs text-destructive max-w-[220px] truncate"
        title={log.errorMessage || "Bilinmeyen hata"}
      >
        {log.errorMessage || "Bilinmeyen hata"}
      </span>
    </div>
  );
}

function DeviceStatus({ log }: { log: NotificationLog }) {
  if (log.receivedAt) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        Ulaştı
      </Badge>
    );
  }

  if (log.status !== "success") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        <AlertCircle className="h-3.5 w-3.5 mr-1" />
        Ulaşmadı
      </Badge>
    );
  }

  const sentAt = new Date(log.sentAt);
  if (sentAt < DEVICE_ACK_TRACKING_STARTED_AT) {
    return (
      <Badge
        variant="outline"
        className="bg-slate-50 text-slate-700 border-slate-300"
        title="Bu kayıt cihaz onayı takibi eklenmeden önce oluştu. Sunucu gönderimi başarılıysa, bu alan iletilmedi anlamına gelmez."
      >
        <Info className="h-3.5 w-3.5 mr-1" />
        Onay ölçülmedi
      </Badge>
    );
  }

  if (Date.now() - sentAt.getTime() < 30_000) {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">
        <Clock className="h-3.5 w-3.5 mr-1" />
        Bekleniyor
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-amber-50 text-amber-800 border-amber-300"
      title="Sunucu gönderdi ancak cihaz service worker onayı gelmedi. Bu tek başına bildirimin ekranda görünmediğini kanıtlamaz."
    >
      <AlertCircle className="h-3.5 w-3.5 mr-1" />
      Cihaz onaylamadı
    </Badge>
  );
}

export function NotificationLogsTable({
  isLoading,
  logs,
  onRefresh,
}: NotificationLogsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-brand" />
              Bildirim Logları
            </CardTitle>
            <CardDescription>
              Son 100 öğün hatırlatıcısı ve test bildirimi
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henüz bildirim logu bulunmuyor
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Danışan</TableHead>
                  <TableHead>Öğün</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Sunucu</TableHead>
                  <TableHead>Cihaz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.sentAt), "dd.MM.yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      {log.client.name} {log.client.surname}
                    </TableCell>
                    <TableCell>
                      {log.ogun ? `${log.ogun.name} (${log.ogun.time})` : "-"}
                    </TableCell>
                    <TableCell>{formatNotificationType(log.type)}</TableCell>
                    <TableCell>
                      <ServerStatus log={log} />
                    </TableCell>
                    <TableCell>
                      <DeviceStatus log={log} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
