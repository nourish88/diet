"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase-browser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { DietFormLogsTable } from "./_components/DietFormLogsTable";
import { NotificationLogsTable } from "./_components/NotificationLogsTable";
import type { DietFormLog, NotificationLog } from "./_components/types";

export default function DietLogsManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [isLoggingEnabled, setIsLoggingEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [logs, setLogs] = useState<DietFormLog[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingNotificationLogs, setIsLoadingNotificationLogs] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);

  const loadLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const data = await apiClient.get<{ logs: DietFormLog[]; total: number }>(
        "/diet-logs?limit=100"
      );
      setLogs(data.logs || []);
      setTotalLogs(data.total || 0);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadNotificationLogs = async () => {
    try {
      setIsLoadingNotificationLogs(true);
      const data = await apiClient.get<{ ok: boolean; logs: NotificationLog[] }>(
        "/analytics/notification-logs"
      );
      setNotificationLogs(data.logs || []);
    } catch (error) {
      console.error("Error loading notification logs:", error);
    } finally {
      setIsLoadingNotificationLogs(false);
    }
  };

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

        const data = await apiClient.get<{ value: string }>(
          "/system-config/diet_form_logging_enabled"
        );
        setIsLoggingEnabled(data.value === "true");

        await Promise.all([loadLogs(), loadNotificationLogs()]);
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
      await apiClient.put("/system-config/diet_form_logging_enabled", {
        value: newValue ? "true" : "false",
        description: "Enable/disable diet form logging",
      });

      setIsLoggingEnabled(newValue);
      toast({
        title: "Başarılı",
        description: newValue
          ? "Diyet formu loglama etkinleştirildi"
          : "Diyet formu loglama devre dışı bırakıldı",
      });

      if (newValue) await loadLogs();
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
        <h1 className="text-3xl font-bold mb-2">Log Yönetimi</h1>
        <p className="text-muted-foreground">
          Diyet formu aktivitelerini ve bildirim teslim durumlarını izleyin
        </p>
      </div>

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
              <p className="text-sm text-muted-foreground">
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

      <Tabs defaultValue="diet-form" className="space-y-4">
        <TabsList>
          <TabsTrigger value="diet-form">Diyet Formu Logları</TabsTrigger>
          <TabsTrigger value="notifications">Bildirim Logları</TabsTrigger>
        </TabsList>

        <TabsContent value="diet-form">
          <DietFormLogsTable
            isEnabled={isLoggingEnabled}
            isLoading={isLoadingLogs}
            logs={logs}
            total={totalLogs}
            onRefresh={loadLogs}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationLogsTable
            isLoading={isLoadingNotificationLogs}
            logs={notificationLogs}
            onRefresh={loadNotificationLogs}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
