import { format } from "date-fns";
import { RefreshCw, Loader2 } from "lucide-react";
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
import type { DietFormLog } from "./types";

interface DietFormLogsTableProps {
  isEnabled: boolean;
  isLoading: boolean;
  logs: DietFormLog[];
  total: number;
  onRefresh: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  form_opened: "Form Açıldı",
  client_selected: "Danışan Seçildi",
  client_changed: "Danışan Değiştirildi",
  field_changed: "Alan Değiştirildi",
  ogun_added: "Öğün Eklendi",
  ogun_removed: "Öğün Silindi",
  ogun_updated: "Öğün Güncellendi",
  item_added: "Öğe Eklendi",
  item_removed: "Öğe Silindi",
  item_updated: "Öğe Güncellendi",
  diet_saved: "Diyet Kaydedildi",
  diet_save_failed: "Diyet Kaydedilemedi",
  template_loaded: "Şablon Yüklendi",
  diet_loaded: "Diyet Yüklendi",
  form_closed: "Form Kapatıldı",
  pdf_generated: "PDF Oluşturuldu",
  validation_error: "Doğrulama Hatası",
};

function actionBadgeClass(action: string) {
  if (action.includes("saved")) return "bg-green-500";
  if (action.includes("failed") || action.includes("error")) return "bg-red-500";
  if (action.includes("opened") || action.includes("selected")) return "bg-blue-500";
  return "bg-gray-500";
}

function formatAction(action: string) {
  return ACTION_LABELS[action] || action;
}

function formatMetadata(log: DietFormLog) {
  const detail = log.fieldValue || JSON.stringify(log.metadata || {});
  return detail.length > 50 ? `${detail.substring(0, 50)}...` : detail;
}

export function DietFormLogsTable({
  isEnabled,
  isLoading,
  logs,
  total,
  onRefresh,
}: DietFormLogsTableProps) {
  if (!isEnabled) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Diyet formu loglaması kapalı. Kayıtları görmek için üstteki ayarı etkinleştirin.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Log Kayıtları</CardTitle>
            <CardDescription>
              Toplam {total} log kaydı (Son 100 kayıt gösteriliyor)
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
            Henüz log kaydı bulunmuyor
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Oturum</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Danışan ID</TableHead>
                  <TableHead>Diyet ID</TableHead>
                  <TableHead>Alan</TableHead>
                  <TableHead>Detay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.sessionId.substring(0, 20)}...
                    </TableCell>
                    <TableCell>
                      <Badge className={actionBadgeClass(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          log.source === "server"
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : "bg-blue-100 text-blue-800 border-blue-300"
                        }
                      >
                        {log.source === "server" ? "Server" : "Client"}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.clientId || "-"}</TableCell>
                    <TableCell>{log.dietId || "-"}</TableCell>
                    <TableCell className="text-sm">{log.fieldName || "-"}</TableCell>
                    <TableCell className="text-xs max-w-md truncate">
                      {log.fieldValue || log.metadata ? (
                        <span title={JSON.stringify(log.metadata || {})}>
                          {formatMetadata(log)}
                        </span>
                      ) : (
                        "-"
                      )}
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
