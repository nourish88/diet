"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase-browser";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { DietFormLogsTable } from "./_components/DietFormLogsTable";
import { NotificationLogsTable } from "./_components/NotificationLogsTable";
import { ApplicationErrorsTable } from "./_components/ApplicationErrorsTable";
import { ClientLoginIssuesTable } from "./_components/ClientLoginIssuesTable";
import { logSettings, type LogSetting } from "@/lib/logging-settings";
import type { DietFormLog, NotificationLog } from "./_components/types";

const settingKeys = Object.keys(logSettings) as LogSetting[];

export default function DietLogsManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<Partial<Record<LogSetting, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [updatingSetting, setUpdatingSetting] = useState<LogSetting | null>(null);
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

        const results = await Promise.allSettled(settingKeys.map(async (key) => {
          const data = await apiClient.get<{ value: string }>(`/system-config/${key}`);
          return [key, data.value === "true"] as const;
        }));
        setSettings(Object.fromEntries(results.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])));
        if (results.some((result) => result.status === "rejected")) {
          toast({ title: "Hata", description: "Bazı kayıt ayarları yüklenemedi.", variant: "destructive" });
        }
        void loadLogs();
        void loadNotificationLogs();
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

  const handleToggleLogging = async (key: LogSetting, enabled: boolean) => {
    try {
      setUpdatingSetting(key);
      const saved = await apiClient.put<{ value: string }>(`/system-config/${key}`, {
        value: String(enabled),
        description: logSettings[key].description,
      });
      const value = saved.value === "true";
      setSettings((current) => ({ ...current, [key]: value }));
      toast({
        title: "Ayar kaydedildi",
        description: `${logSettings[key].label} ${value ? "açıldı" : "kapatıldı"}.`,
      });
      if (key === "diet_form_logging_enabled" && value) void loadLogs();
    } catch (error) {
      console.error("Error toggling logging:", error);
      toast({
        title: "Hata",
        description: "Ayar güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setUpdatingSetting(null);
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
        <h1 className="text-3xl font-bold">Log Yönetimi</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Kayıt Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {settingKeys.map((key) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="space-y-0.5">
                <Label htmlFor={key} className="text-base">{logSettings[key].label}</Label>
                <p id={`${key}-description`} className="text-sm text-muted-foreground">
                  {settings[key] === undefined ? "Ayar yüklenemedi." : logSettings[key].description}
                </p>
              </div>
              {updatingSetting === key && <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin" aria-hidden />}
              <Switch
                id={key}
                aria-describedby={`${key}-description`}
                checked={settings[key] ?? false}
                onCheckedChange={(value) => void handleToggleLogging(key, value)}
                disabled={updatingSetting !== null || settings[key] === undefined}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="errors">Uygulama Hataları</TabsTrigger>
          <TabsTrigger value="client-login">Danışan Giriş Sorunları</TabsTrigger>
          <TabsTrigger value="diet-form">Diyet Formu Logları</TabsTrigger>
          <TabsTrigger value="notifications">Bildirim Logları</TabsTrigger>
        </TabsList>

        <TabsContent value="errors"><ApplicationErrorsTable /></TabsContent>
        <TabsContent value="client-login">
          <ClientLoginIssuesTable enabled={settings.application_error_logging_enabled} />
        </TabsContent>

        <TabsContent value="diet-form">
          <DietFormLogsTable
            isEnabled={settings.diet_form_logging_enabled === true}
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
