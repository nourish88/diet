"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingReminders, setCheckingReminders] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    loadData();
    checkNotificationPermission();
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // Get user info
      const userData = await apiClient.get<{ user: { id: number } }>("/auth/sync");
      const userIdNum = userData.user.id;
      setUserId(userIdNum);

      // Load notification preferences
      await loadPreferences(userIdNum);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Hata",
        description: "Ayarlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async (userId: number) => {
    try {
      const data = await apiClient.get<{ success: boolean; preferences: NotificationPreference }>(`/notifications/preferences?userId=${userId}`);
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const checkNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === "granted") {
          toast({
            title: "Bildirim izni verildi",
            description: "Artık öğün hatırlatıcıları alabilirsiniz.",
          });
        } else {
          toast({
            title: "Bildirim izni reddedildi",
            description: "Bildirimler için tarayıcı ayarlarından izin vermeniz gerekir.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
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
      const data = await apiClient.post<{ success: boolean; reminders: any[] }>("/notifications/check-meal-reminders");
      if (data.success) {
        toast({
          title: "Kontrol tamamlandı",
          description: data.reminders.length > 0
            ? `${data.reminders.length} hatırlatıcı bulundu ve bildirimler gönderildi.`
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
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ayarlar</h1>
        <p className="text-gray-600">Bildirim tercihlerinizi yönetin</p>
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
          {/* Notification Permission Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {notificationPermission === "granted" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="font-medium text-gray-900">Bildirim İzni</p>
                <p className="text-sm text-gray-600">
                  {notificationPermission === "granted"
                    ? "Bildirimler için izin verildi"
                    : notificationPermission === "denied"
                    ? "Bildirimler için izin reddedildi"
                    : "Bildirimler için izin bekleniyor"}
                </p>
              </div>
            </div>
            {notificationPermission !== "granted" && (
              <Button
                onClick={requestNotificationPermission}
                variant="outline"
                size="sm"
              >
                İzin Ver
              </Button>
            )}
          </div>

          {/* Meal Reminders Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-gray-900">Öğün Hatırlatıcıları</p>
              <p className="text-sm text-gray-600 mt-1">
                Her öğünden 30 dakika önce bildirim alın
              </p>
            </div>
            <Switch
              checked={preferences?.mealReminders ?? true}
              onCheckedChange={handleToggleMealReminders}
              disabled={saving || notificationPermission !== "granted"}
            />
          </div>

          {/* Manual Check Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleCheckReminders}
              disabled={checkingReminders || notificationPermission !== "granted"}
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
            <p className="text-xs text-gray-500 mt-2 text-center">
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

