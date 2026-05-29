"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  Megaphone,
  Smartphone,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  OfficeSocialMediaTask,
  officeSocialMediaTasks,
} from "@/lib/office-social-media-plan";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { setupPushNotificationsForUser } from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

type ReminderStatus = {
  loading: boolean;
  configured: boolean;
  subscriptionCount: number;
  error: string | null;
};

type ReminderResponse = {
  ok: boolean;
  sent?: number;
  failed?: number;
  code?: string;
  message?: string;
};

const STORAGE_KEY = "office-social-media-completed-v1";

const groupLabels: Record<OfficeSocialMediaTask["group"], string> = {
  setup: "Kurulum",
  weekly: "Haftalık akış",
  routine: "Rutin",
};

export function OfficeSocialMediaPlanner() {
  const { databaseUser } = useAuth();
  const { toast } = useToast();
  const [openTaskId, setOpenTaskId] = useState("instagram-profile");
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [permission, setPermission] =
    useState<NotificationPermission | "unsupported">("unsupported");
  const [status, setStatus] = useState<ReminderStatus>({
    loading: true,
    configured: false,
    subscriptionCount: 0,
    error: null,
  });
  const [sendingTaskId, setSendingTaskId] = useState<string | null>(null);
  const [enablingNotifications, setEnablingNotifications] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setCompletedTaskIds(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setPermission(getNotificationPermission());
  }, []);

  const loadReminderStatus = async () => {
    if (!databaseUser || databaseUser.role !== "dietitian") {
      setStatus({
        loading: false,
        configured: false,
        subscriptionCount: 0,
        error: null,
      });
      return;
    }

    setStatus((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await apiClient.get<{
        ok: boolean;
        configured: boolean;
        subscriptionCount: number;
      }>("/office-reminders");
      setStatus({
        loading: false,
        configured: Boolean(data.configured),
        subscriptionCount: data.subscriptionCount ?? 0,
        error: null,
      });
    } catch (error: any) {
      setStatus({
        loading: false,
        configured: false,
        subscriptionCount: 0,
        error: error?.message || "Bildirim durumu alınamadı.",
      });
    }
  };

  useEffect(() => {
    loadReminderStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseUser?.id, databaseUser?.role]);

  const groupedTasks = useMemo(() => {
    return officeSocialMediaTasks.reduce((acc, task) => {
      acc[task.group] = acc[task.group] || [];
      acc[task.group].push(task);
      return acc;
    }, {} as Record<OfficeSocialMediaTask["group"], OfficeSocialMediaTask[]>);
  }, []);

  const completedCount = completedTaskIds.length;
  const progressPercent = Math.round(
    (completedCount / officeSocialMediaTasks.length) * 100
  );

  const toggleCompleted = (taskId: string) => {
    setCompletedTaskIds((current) => {
      const next = current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId];

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  };

  const handleEnableNotifications = async (): Promise<boolean> => {
    if (!databaseUser || databaseUser.role !== "dietitian") {
      toast({
        title: "Diyetisyen hesabı gerekli",
        description: "Ofis hatırlatıcıları diyetisyen panelinde çalışır.",
        variant: "destructive",
      });
      return false;
    }

    setEnablingNotifications(true);
    try {
      const result = await setupPushNotificationsForUser(databaseUser.id, {
        requestPermissionIfDefault: true,
        respectPromptMemory: false,
      });
      setPermission(getNotificationPermission());
      await loadReminderStatus();

      if (result.ok) {
        toast({
          title: "Bildirimler hazır",
          description:
            "Bu cihaz diyetisyen ofis hatırlatıcılarını alabilecek.",
        });
        return true;
      }

      toast({
        title: "Bildirim açılamadı",
        description: notificationReasonToMessage(result.reason),
        variant: "destructive",
      });
      return false;
    } catch (error: any) {
      toast({
        title: "Bildirim açılamadı",
        description: error?.message || "Cihaz aboneliği oluşturulamadı.",
        variant: "destructive",
      });
      return false;
    } finally {
      setEnablingNotifications(false);
    }
  };

  const handleSendReminder = async (task: OfficeSocialMediaTask) => {
    if (sendingTaskId) return;

    setSendingTaskId(task.id);
    try {
      if (permission !== "granted") {
        const enabled = await handleEnableNotifications();
        if (!enabled) return;
      }

      const data = await apiClient.post<ReminderResponse>("/office-reminders", {
        taskId: task.id,
      });

      if (data.ok) {
        toast({
          title: "Hatırlatıcı gönderildi",
          description: `${data.sent ?? 0} cihaza ofis bildirimi iletildi.`,
        });
      } else {
        toast({
          title: "Hatırlatıcı gönderilemedi",
          description: data.message || "Bilinmeyen hata oluştu.",
          variant: "destructive",
        });
      }

      await loadReminderStatus();
    } catch (error: any) {
      toast({
        title: "Hatırlatıcı gönderilemedi",
        description:
          error?.details?.message ||
          error?.message ||
          "Sunucu ile iletişim kurulamadı.",
        variant: "destructive",
      });
    } finally {
      setSendingTaskId(null);
    }
  };

  return (
    <section className="mb-16">
      <div className="rounded-lg border-2 border-emerald-600 bg-card shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 p-5 sm:p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="h-6 w-6 shrink-0" />
                <h2 className="text-2xl font-semibold">
                  Ofis İçin Yapman Gerekenler
                </h2>
              </div>
              <p className="text-sm sm:text-base text-white/90 max-w-3xl">
                Sosyal medya stratejisini günlük ofis akışına çeviren takip
                paneli. Maddeleri aç, uygula, tamamla ve gerekiyorsa PWA
                üzerinden telefonuna hatırlatıcı gönder.
              </p>
            </div>

            <div className="rounded-md bg-white/12 border border-white/20 p-3 min-w-[220px]">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Tamamlanma</span>
                <span className="font-semibold">{progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/85">
                {completedCount}/{officeSocialMediaTasks.length} görev
                tamamlandı
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <BellRing className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Diyetisyen PWA hatırlatıcısı
                </h3>
                <p className="text-xs text-muted-foreground">
                  Bildirimler bu diyetisyen hesabına bağlı PWA cihazlarına
                  gider. Telefonunda PWA açık ve bildirim izni verilmiş olmalı.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <NotificationStatusBadge
                permission={permission}
                status={status}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnableNotifications}
                disabled={enablingNotifications}
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              >
                {enablingNotifications ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4" />
                )}
                Bildirimleri aç
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            {(["setup", "weekly", "routine"] as const).map((group) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2">
                  <SectionIcon group={group} />
                  <h3 className="font-semibold text-foreground">
                    {groupLabels[group]}
                  </h3>
                </div>
                <div className="space-y-2">
                  {groupedTasks[group]?.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isOpen={openTaskId === task.id}
                      isCompleted={completedTaskIds.includes(task.id)}
                      isSending={sendingTaskId === task.id}
                      onToggleOpen={() =>
                        setOpenTaskId((current) =>
                          current === task.id ? "" : task.id
                        )
                      }
                      onToggleCompleted={() => toggleCompleted(task.id)}
                      onSendReminder={() => handleSendReminder(task)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Kaynak akış: docs/SOSYAL-MEDYA-STRATEJISI.md
          </p>
        </div>
      </div>
    </section>
  );
}

function TaskRow({
  task,
  isOpen,
  isCompleted,
  isSending,
  onToggleOpen,
  onToggleCompleted,
  onSendReminder,
}: {
  task: OfficeSocialMediaTask;
  isOpen: boolean;
  isCompleted: boolean;
  isSending: boolean;
  onToggleOpen: () => void;
  onToggleCompleted: () => void;
  onSendReminder: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background transition-colors",
        isOpen ? "border-emerald-500" : "border-border",
        isCompleted && "bg-emerald-50/60 border-emerald-200"
      )}
    >
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full text-left p-3 sm:p-4 flex items-center gap-3"
      >
        <span
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
            isCompleted ? "bg-emerald-600 text-white" : "bg-muted text-brand"
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <CalendarDays className="h-5 w-5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 mb-1">
            {task.day && (
              <Badge variant="outline" className="text-[11px]">
                {task.day}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {task.timeLabel}
            </span>
          </span>
          <span className="block font-semibold text-foreground">
            {task.title}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="px-3 sm:px-4 pb-4">
          <div className="pl-0 sm:pl-12">
            <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
              <Target className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />
              <p>{task.goal}</p>
            </div>

            <ul className="space-y-2 mb-4">
              {task.steps.map((step) => (
                <li key={step} className="flex gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant={isCompleted ? "secondary" : "outline"}
                size="sm"
                onClick={onToggleCompleted}
                className={cn(
                  !isCompleted &&
                    "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isCompleted ? "Tamamlandı" : "Tamamlandı işaretle"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSendReminder}
                disabled={isSending}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Telefona hatırlatıcı gönder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationStatusBadge({
  permission,
  status,
}: {
  permission: NotificationPermission | "unsupported";
  status: ReminderStatus;
}) {
  if (permission === "unsupported") {
    return (
      <Badge variant="outline" className="w-fit">
        Destek yok
      </Badge>
    );
  }

  if (status.loading) {
    return (
      <Badge variant="outline" className="w-fit gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Kontrol ediliyor
      </Badge>
    );
  }

  if (!status.configured) {
    return (
      <Badge variant="outline" className="w-fit">
        Sunucu ayarı eksik
      </Badge>
    );
  }

  if (permission !== "granted" || status.subscriptionCount === 0) {
    return (
      <Badge variant="outline" className="w-fit">
        Bildirim kapalı
      </Badge>
    );
  }

  return (
    <Badge className="w-fit bg-emerald-600 hover:bg-emerald-600">
      {status.subscriptionCount} cihaz hazır
    </Badge>
  );
}

function SectionIcon({ group }: { group: OfficeSocialMediaTask["group"] }) {
  if (group === "weekly") {
    return <CalendarDays className="h-5 w-5 text-sky-600" />;
  }
  if (group === "routine") {
    return <Megaphone className="h-5 w-5 text-amber-600" />;
  }
  return <ClipboardCheck className="h-5 w-5 text-emerald-600" />;
}

function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

function notificationReasonToMessage(reason?: string) {
  switch (reason) {
    case "unsupported":
      return "Bu tarayıcı PWA push bildirimlerini desteklemiyor.";
    case "denied":
      return "Bildirim izni tarayıcı/telefon ayarlarında engellenmiş.";
    case "dismissed":
      return "Bildirim izni verilmedi.";
    case "missing-registration":
      return "Service worker kaydı oluşturulamadı.";
    case "missing-subscription":
      return "Push aboneliği oluşturulamadı.";
    default:
      return "Bildirim izni tamamlanamadı.";
  }
}

export default OfficeSocialMediaPlanner;
