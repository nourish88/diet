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
import { getDeviceDeliveryStatus, notificationTypeLabel, type NotificationLog } from "@/lib/notification-log";
import { NotificationDiagnosticsCells } from "./NotificationDiagnosticsCells";

interface NotificationLogsTableProps {
  isLoading: boolean;
  logs: NotificationLog[];
  onRefresh: () => void;
  isRefreshing?: boolean;
  description?: string;
}

function ServerStatus({ log }: { log: NotificationLog }) {
  if (log.status === "pending") return <Badge variant="outline">Gönderiliyor</Badge>;
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
  const state = getDeviceDeliveryStatus(log);
  if (state === "sending") return <Badge variant="outline">Gönderim bekleniyor</Badge>;
  if (state === "delivered") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        Ulaştı
      </Badge>
    );
  }

  if (state === "failed") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        <AlertCircle className="h-3.5 w-3.5 mr-1" />
        Ulaşmadı
      </Badge>
    );
  }

  if (state === "untracked") {
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

  if (state === "waiting") {
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
      title="Bildirim gönderildi. Cihazdan henüz yanıt gelmedi."
    >
      <AlertCircle className="h-3.5 w-3.5 mr-1" />
      Ulaştığı doğrulanamadı
    </Badge>
  );
}

export function NotificationLogsTable({
  isLoading,
  logs,
  onRefresh,
  isRefreshing = false,
  description = "Son 100 öğün hatırlatıcısı ve test bildirimi",
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
              {description}. Her satır bir bildirim aboneliğine aittir; aynı telefonun farklı tarayıcıları ayrı abonelik olabilir.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading || isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isRefreshing ? "animate-spin" : ""}`} />
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
                  <TableHead>Teslim</TableHead>
                  <TableHead>Hedef cihaz</TableHead>
                  <TableHead>Neden / bulgu</TableHead>
                  <TableHead>Danışana öneri</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap align-top">
                      {format(new Date(log.sentAt), "dd.MM.yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      {log.client.name} {log.client.surname}
                    </TableCell>
                    <TableCell>
                      {log.ogun ? `${log.ogun.name} (${log.ogun.time})` : "-"}
                    </TableCell>
                    <TableCell>{notificationTypeLabel(log.type)}</TableCell>
                    <TableCell>
                      <ServerStatus log={log} />
                    </TableCell>
                    <TableCell>
                      <DeviceStatus log={log} />
                    </TableCell>
                    <NotificationDiagnosticsCells log={log} />
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
