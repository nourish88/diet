"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { setupPushNotificationsForUser } from "@/lib/push-notifications";

interface NotificationPreference {
  id: number;
  userId: number;
  mealReminders: boolean;
  dietUpdates: boolean;
  comments: boolean;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  const navStandalone = (window.navigator as any).standalone === true;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
  return navStandalone || displayStandalone;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { databaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingReminders, setCheckingReminders] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [iosNotStandalone, setIosNotStandalone] = useState(false);

  const userId = (databaseUser as any)?.id as number | undefined;

  useEffect(() => {
    checkNotificationPermission();
    if (isIOS() && !isStandalonePWA()) {
      setIosNotStandalone(true);
    }
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

  const checkNotificationPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    try {
      if (!userId) {
        toast({
          title: "Oturum bulunamadı",
          description: "Bildirimleri açmak için tekrar giriş yapın.",
          variant: "destructive",
        });
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        const setupResult = await setupPushNotificationsForUser(userId, {
          requestPermissionIfDefault: false,
          respectPromptMemory: false,
        });

        if (!setupResult.ok) {
          toast({
            title: "Bildirim aboneliği oluşturulamadı",
            description: "İzin verildi ama cihaz aboneliği kaydedilemedi. Sayfayı yenileyip tekrar deneyin.",
            variant: "destructive",
          });
          return;
        }

        setShowIOSGuide(false);
        toast({
          title: "Bildirim izni verildi",
          description: "Artık öğün hatırlatıcıları alabilirsiniz.",
        });
      } else if (permission === "denied") {
        if (isIOS()) {
          setShowIOSGuide(true);
        } else {
          toast({
            title: "Bildirim izni reddedildi",
            description: "Bildirimler için tarayıcı ayarlarından izin vermeniz gerekir.",
            variant: "destructive",
          });
        }
      } else {
        // "default" — dialog dismissed without choosing (common on iOS)
        if (isIOS()) {
          setShowIOSGuide(true);
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast({
        title: "Hata",
        description: "Bildirim izni alınırken bir sorun oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
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
        const reg = await (navigator.serviceWorker?.ready ?? Promise.resolve(undefined));
        const sub = await reg?.pushManager.getSubscription();
        if (!sub) {
          toast({ title: "Abonelik bulunamadı", description: "Bildirim alabilmek için push aboneliği gerekli.", variant: "destructive" });
          setCheckingReminders(false);
          return;
        }
      } catch {}

      const data = await apiClient.get<{ success: boolean; reminders: any[] }>("/notifications/check-meal-reminders");
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
          {/* Notification Permission Status */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              {notificationPermission === "granted" ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-medium text-foreground">Bildirim İzni</p>
                <p className="text-sm text-muted-foreground">
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

          {/* iOS: app opened in Safari, not from home screen */}
          {iosNotStandalone && notificationPermission !== "granted" && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900 mb-1">Uygulamayı Ana Ekrandan Açın</p>
                <p className="text-sm text-red-800 mb-2">
                  iPhone'da bildirimler <strong>sadece</strong> uygulama ana ekran simgesinden açıldığında çalışır. Şu an Safari'den açıyorsunuz.
                </p>
                <ol className="text-sm text-red-800 space-y-1 list-decimal list-inside">
                  <li>Bu sekmeyi kapatın</li>
                  <li>iPhone ana ekranındaki <strong>Diyetisyen Ezgi</strong> simgesine dokunun</li>
                  <li>Uygulama açıldıktan sonra Ayarlar &gt; Bildirim Tercihleri'ne gelin</li>
                  <li>"İzin Ver" butonuna basın</li>
                </ol>
              </div>
            </div>
          )}

          {/* iOS Guide — for cases where permission was previously denied/dismissed */}
          {showIOSGuide && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-900 mb-1">iPhone'da Bildirim İzni Nasıl Verilir?</p>
                <p className="text-sm text-amber-800 mb-2">
                  Bildirim izni daha önce reddedilmiş. iPhone Ayarlar'dan açmanız gerekiyor:
                </p>
                <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                  <li>iPhone'da <strong>Ayarlar</strong> uygulamasını açın</li>
                  <li><strong>Bildirimler</strong> bölümüne gidin</li>
                  <li>Listeden <strong>Diyetisyen Ezgi</strong>'yi bulun</li>
                  <li><strong>Bildirimlere İzin Ver</strong> seçeneğini açın</li>
                  <li>Uygulamaya geri dönüp sayfayı yenileyin</li>
                </ol>
                <p className="text-xs text-amber-700 mt-2">
                  Not: Uygulama listede yoksa, önce ana ekrandaki simgeden açıp "İzin Ver"e basmanız gerekir.
                </p>
              </div>
            </div>
          )}

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
