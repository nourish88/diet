"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  MessageCircle,
  LogOut,
  ChevronRight,
  Globe,
  Star,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface UnreadData {
  totalUnread: number;
  unreadByDiet: Record<number, number>;
}

export default function ClientDashboard() {
  const DIETITIAN_WEBSITE_URL =
    process.env.NEXT_PUBLIC_DIETITIAN_WEBSITE_URL ||
    "https://ezgievginaktas.com";
  const GOOGLE_REVIEW_URL =
    "https://www.google.com/maps/place/Diyetisyen+Ezgi+Evgin/@39.9669753,32.6332346,17z/data=!3m1!4b1!4m6!3m5!1s0x14d330d2f71d4659:0x83b8bf59458d8408!8m2!3d39.9669753!4d32.6358095!16s%2Fg%2F11dymr8nhs?entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D";

  const router = useRouter();
  const { databaseUser } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [unreadData, setUnreadData] = useState<UnreadData>({
    totalUnread: 0,
    unreadByDiet: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Refresh unread messages every 30 seconds
    const interval = setInterval(() => {
      loadUnreadMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Check for meal reminders when dashboard loads
  useEffect(() => {
    const checkMealReminders = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return;
        }

        // Only check if notifications are permitted and a push subscription exists
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            try {
              const reg = await (navigator.serviceWorker?.ready ??
                Promise.resolve(undefined));
              const sub = await reg?.pushManager.getSubscription();
              if (sub) {
                await apiClient
                  .get<{ success: boolean; reminders: any[] }>(
                    "/notifications/check-meal-reminders"
                  )
                  .catch(() => {});
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (error) {
        // Silently fail - reminders are also handled by cron job
        console.debug("Meal reminder check failed:", error);
      }
    };

    // Check reminders after a short delay to not block page load
    const timeout = setTimeout(checkMealReminders, 2000);
    return () => clearTimeout(timeout);
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

      // Use already-synced auth context to avoid extra roundtrip
      const client = (databaseUser as any)?.client;
      setUserName((client?.name as string) || "Danışan");

      if (client?.id) {
        loadUnreadMessages(client.id as number);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadMessages = async (clientId?: number) => {
    try {
      // Get client ID if not provided
      if (!clientId) {
        const client = (databaseUser as any)?.client;
        clientId = client?.id as number | undefined;
      }

      if (!clientId) return;

      const data = await apiClient.get<{
        totalUnread: number;
        unreadByDiet: Record<number, number>;
      }>(`/clients/${clientId}/unread-messages`);
      setUnreadData({
        totalUnread: data.totalUnread || 0,
        unreadByDiet: data.unreadByDiet || {},
      });
    } catch (error) {
      console.error("Error loading unread messages:", error);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/ezgi_evgin-removebg-preview.png"
            alt="Ezgi Evgin Beslenme ve Diyet Danışmanlığı"
            className="max-w-[180px] h-auto"
            style={{ width: "180px", height: "auto" }}
          />
        </div>
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hoş Geldiniz, {userName}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Beslenme programlarınıza göz atın ve diyetisyeninizle iletişime
            geçin
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Diets Card */}
          <Link
            href="/client/diets"
            className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 p-8 transition-all transform hover:scale-105 cursor-pointer group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow">
                <UtensilsCrossed className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Diyetlerim
              </h3>
              <p className="text-gray-600 mb-4">
                Beslenme programlarınızı görüntüleyin
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                Görüntüle
                <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Messages Card */}
          <Link
            href="/client/conversations"
            className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-purple-500 p-8 transition-all transform hover:scale-105 cursor-pointer group relative"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow relative">
                <MessageCircle className="w-10 h-10 text-white" />
                {unreadData.totalUnread > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center border-4 border-white shadow-lg">
                    {unreadData.totalUnread}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Sohbetlerim
              </h3>
              <p className="text-gray-600 mb-4">
                {unreadData.totalUnread > 0
                  ? `${unreadData.totalUnread} yeni mesajınız var`
                  : "Tüm sohbetlerinizi görüntüleyin"}
              </p>
              <div className="flex items-center text-purple-600 font-medium">
                Görüntüle
                <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        <div className="mb-3 text-center">
          <p className="text-sm font-semibold text-gray-700">Web ve Yorum</p>
          <p className="text-xs text-gray-500">
            Web sitemizi inceleyin, deneyiminizi Google&apos;da paylaşarak daha
            fazla danışana yol gösterin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <a
            href={DIETITIAN_WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-400 p-5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Web Sitemizi İnceleyin
                  </p>
                  <p className="text-xs text-gray-500">
                    Programlar, içerikler ve danışmanlık detayları
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-blue-600" />
            </div>
          </a>

          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-amber-400 p-5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Google&apos;da Bizi Değerlendirin
                  </p>
                  <p className="text-xs text-gray-500">
                    Yorumunuz, doğru diyetisyen arayanlara destek olur
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-amber-600" />
            </div>
          </a>
        </div>

        <p className="text-center text-xs text-gray-500 mb-8">
          30 saniyede web sitemizi gezebilir, 1-2 cümle yorumunuzla bize katkı
          sağlayabilirsiniz.
        </p>

        {/* Logout Card */}
        <div className="max-w-md mx-auto">
          <button
            onClick={handleLogout}
            className="w-full bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-red-500 p-6 transition-all hover:shadow-xl group"
          >
            <div className="flex items-center justify-center space-x-3">
              <LogOut className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold text-red-600">
                Çıkış Yap
              </span>
            </div>
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-white/50 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 text-center">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">
              💡 Yardıma mı ihtiyacınız var?
            </span>
            <br />
            Diyetisyeninizle sohbet bölümünden iletişime geçebilirsiniz
          </p>
        </div>
      </div>
    </div>
  );
}
