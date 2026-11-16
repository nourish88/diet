"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PushNotificationCard from "@/components/client/PushNotificationCard";
import { getActiveServiceWorker } from "@/lib/service-worker";

interface NotificationPreference {
  id: number;
  userId: number;
  mealReminders: boolean;
  dietUpdates: boolean;
  comments: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { databaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingReminders, setCheckingReminders] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [notificationsReady, setNotificationsReady] = useState(false);

  const userId = databaseUser?.id;

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (userId) {
      loadPreferences(userId);
    }
  }, [userId]);

  const checkSession = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }
    } catch (error) {
      console.error("Error checking session:", error);
      toast({
        title: "Hata",
        description: "Ayarlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async (uid: number) => {
    try {
      const data = await apiClient.get<{ success: boolean; preferences: NotificationPreference }>(`/notifications/preferences?userId=${uid}`);
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const handleToggleMealReminders = async (enabled: boolean) => {
    if (!userId) return;

    setSaving(true);
    try {
      const data = await apiClient.put<{ success: boolean; preferences: NotificationPreference }>("/notifications/preferences", {
        userId,
        mealReminders: enabled,
      });

      if (data.success && data.preferences) {
        setPreferences(data.preferences);
        toast({
          title: enabled ? "Öğün hatırlatıcıları açıldı" : "Öğün hatırlatıcıları kapatıldı",
          description: enabled
            ? "Artık öğün saatlerinden 30 dakika önce bildirim alacaksınız."
            : "Öğün hatırlatıcıları devre dışı bırakıldı.",
        });
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast({
        title: "Hata",
        description: "Tercihler güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckReminders = async () => {
    setCheckingReminders(true);
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted") {
          toast({ title: "Bildirim izni gerekli", description: "Lütfen bildirim izni verin.", variant: "destructive" });
          setCheckingReminders(false);
          return;
        }
      }
      try {
        const reg = await getActiveServiceWorker();
        const sub = await reg?.pushManager.getSubscription();
        if (!sub) {
          toast({ title: "Abonelik bulunamadı", description: "Bildirim alabilmek için push aboneliği gerekli.", variant: "destructive" });
          setCheckingReminders(false);
          return;
        }
      } catch {
        throw new Error("Cihaz bildirim kaydı kontrol edilemedi. Bildirim kaydını yenileyip tekrar deneyin.");
      }

      const data = await apiClient.get<{ success: boolean; reminders: unknown[]; sent?: number; failed?: number }>("/notifications/check-meal-reminders");
      if (data.success) {
        toast({
          title: "Kontrol tamamlandı",
          description: data.reminders.length > 0
            ? `${data.reminders.length} hatırlatıcı bulundu. ${data.sent ?? 0} gönderim kabul edildi, ${data.failed ?? 0} gönderim başarısız.`
            : "Şu anda gönderilecek hatırlatıcı bulunmuyor.",
        });
      }
    } catch (error) {
      console.error("Error checking reminders:", error);
      toast({
        title: "Hata",
        description: "Hatırlatıcılar kontrol edilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setCheckingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Ayarlar</h1>
        <p className="text-muted-foreground">Bildirim tercihlerinizi yönetin</p>
      </div>

      {/* Notification Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Bildirim Tercihleri
          </CardTitle>
          <CardDescription>
            Öğün hatırlatıcıları ve diğer bildirimleri yönetin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PushNotificationCard onReadyChange={setNotificationsReady} />

          {/* Meal Reminders Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-foreground">Öğün Hatırlatıcıları</p>
              <p className="text-sm text-muted-foreground mt-1">
                Her öğünden 30 dakika önce bildirim alın
              </p>
            </div>
            <Switch
              checked={preferences?.mealReminders ?? true}
              onCheckedChange={handleToggleMealReminders}
              disabled={saving || !notificationsReady}
            />
          </div>

          {/* Manual Check Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleCheckReminders}
              disabled={checkingReminders || !notificationsReady}
              variant="outline"
              className="w-full"
            >
              {checkingReminders ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kontrol ediliyor...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Hatırlatıcıları Kontrol Et
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Şu anki hatırlatıcıları manuel olarak kontrol edin
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-900 mb-1">
                Öğün Hatırlatıcıları Hakkında
              </p>
              <p className="text-sm text-blue-800">
                Öğün hatırlatıcıları, son 14 gün içinde yazılan diyetinizdeki öğünlerden 30 dakika önce otomatik olarak gönderilir.
                Bildirimler, tarayıcı bildirim izinleriniz açık olduğunda ve bu ayar aktifken gönderilir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
