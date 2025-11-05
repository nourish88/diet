"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";

interface DietFormLog {
  id: number;
  sessionId: string;
  clientId: number | null;
  dietId: number | null;
  action: string;
  fieldName: string | null;
  fieldValue: string | null;
  previousValue: string | null;
  metadata: any;
  createdAt: string;
  dietitian: {
    id: number;
    email: string;
  };
}

export default function DietLogsManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [isLoggingEnabled, setIsLoggingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [logs, setLogs] = useState<DietFormLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);

  // Check authentication and load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        // Load logging status
        const response = await fetch("/api/system-config/diet_form_logging_enabled", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsLoggingEnabled(data.value === "true");
        }

        // Load logs
        await loadLogs(session.access_token);
      } catch (error) {
        console.error("Error loading config:", error);
        toast({
          title: "Hata",
          description: "Ayarlar yüklenirken bir hata oluştu",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [router, supabase, toast]);

  const loadLogs = async (token: string) => {
    try {
      setIsLoadingLogs(true);
      const response = await fetch("/api/diet-logs?limit=100", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalLogs(data.total || 0);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleToggleLogging = async () => {
    try {
      setIsToggling(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Hata",
          description: "Oturum bulunamadı",
          variant: "destructive",
        });
        return;
      }

      const newValue = !isLoggingEnabled;
      const response = await fetch("/api/system-config/diet_form_logging_enabled", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: newValue ? "true" : "false",
          description: "Enable/disable diet form logging",
        }),
      });

      if (response.ok) {
        setIsLoggingEnabled(newValue);
        toast({
          title: "Başarılı",
          description: newValue
            ? "Diyet formu loglama etkinleştirildi"
            : "Diyet formu loglama devre dışı bırakıldı",
        });

        // Reload logs if enabled
        if (newValue) {
          await loadLogs(session.access_token);
        }
      } else {
        throw new Error("Failed to update config");
      }
    } catch (error) {
      console.error("Error toggling logging:", error);
      toast({
        title: "Hata",
        description: "Ayar güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleRefreshLogs = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await loadLogs(session.access_token);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("saved")) return "bg-green-500";
    if (action.includes("failed") || action.includes("error"))
      return "bg-red-500";
    if (action.includes("opened") || action.includes("selected"))
      return "bg-blue-500";
    return "bg-gray-500";
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
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
    return actionMap[action] || action;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Diyet Formu Loglama Yönetimi</h1>
        <p className="text-gray-600">
          Diyet formu aktivitelerini izleyin ve logları görüntüleyin
        </p>
      </div>

      {/* Configuration Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Loglama Ayarları</CardTitle>
          <CardDescription>
            Diyet formu loglamasını etkinleştirin veya devre dışı bırakın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="logging-toggle" className="text-base">
                Diyet Formu Loglama
              </Label>
              <p className="text-sm text-gray-500">
                Form açıldığında, danışan seçildiğinde ve tüm değişikliklerde
                otomatik olarak log oluşturulur
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                id="logging-toggle"
                checked={isLoggingEnabled}
                onCheckedChange={handleToggleLogging}
                disabled={isToggling}
              />
              {isToggling && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Card */}
      {isLoggingEnabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Log Kayıtları</CardTitle>
                <CardDescription>
                  Toplam {totalLogs} log kaydı (Son 100 kayıt gösteriliyor)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshLogs}
                disabled={isLoadingLogs}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoadingLogs ? "animate-spin" : ""}`}
                />
                Yenile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
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
                          <Badge
                            className={getActionBadgeColor(log.action)}
                          >
                            {formatAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.clientId || "-"}</TableCell>
                        <TableCell>{log.dietId || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {log.fieldName || "-"}
                        </TableCell>
                        <TableCell className="text-xs max-w-md truncate">
                          {log.fieldValue || log.metadata ? (
                            <span title={JSON.stringify(log.metadata || {})}>
                              {log.fieldValue?.substring(0, 50) ||
                                JSON.stringify(log.metadata || {}).substring(0, 50)}
                              ...
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
      )}
    </div>
  );
}

