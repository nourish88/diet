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
  X,
  Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { GOOGLE_REVIEW_URL, DIETITIAN_WEBSITE_URL } from "@/lib/site-urls";

interface UnreadData {
  totalUnread: number;
  unreadByDiet: Record<number, number>;
}

const WELCOME_DISMISS_KEY = "client_welcome_dismissed_v1";
const REVIEW_DONE_KEY = "client_review_done";
const REVIEW_DISMISSED_KEY = "client_review_dismissed_at";
const FIRST_VISIT_KEY = "client_first_visit";
// Show review prompt after 7 days, re-show after 30 days if only dismissed
const REVIEW_SHOW_AFTER_DAYS = 7;
const REVIEW_RESHOW_AFTER_DAYS = 30;

function shouldShowReviewPrompt(): boolean {
  try {
    if (localStorage.getItem(REVIEW_DONE_KEY)) return false;

    const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    if (!firstVisit) {
      localStorage.setItem(FIRST_VISIT_KEY, Date.now().toString());
      return false;
    }

    const daysSinceFirstVisit =
      (Date.now() - parseInt(firstVisit)) / (1000 * 60 * 60 * 24);
    if (daysSinceFirstVisit < REVIEW_SHOW_AFTER_DAYS) return false;

    const dismissed = localStorage.getItem(REVIEW_DISMISSED_KEY);
    if (dismissed) {
      const daysSinceDismiss =
        (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < REVIEW_RESHOW_AFTER_DAYS) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export default function ClientDashboard() {
  const router = useRouter();
  const { databaseUser, signOut } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [unreadData, setUnreadData] = useState<UnreadData>({
    totalUnread: 0,
    unreadByDiet: {},
  });
  const [loading, setLoading] = useState(true);
  const [showWelcomeTip, setShowWelcomeTip] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        if (!localStorage.getItem(WELCOME_DISMISS_KEY)) {
          setShowWelcomeTip(true);
        }
        setShowReviewPrompt(shouldShowReviewPrompt());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const client = (databaseUser as any)?.client;
    if (client?.name) {
      setUserName(client.name as string);
    }
  }, [databaseUser]);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadUnreadMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkMealReminders = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

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
        console.debug("Meal reminder check failed:", error);
      }
    };

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
    await signOut();
  };

  const handleReviewClick = () => {
    try {
      localStorage.setItem(REVIEW_DONE_KEY, "clicked");
    } catch {}
    setShowReviewPrompt(false);
    window.open(GOOGLE_REVIEW_URL, "_blank", "noopener,noreferrer");
  };

  const handleReviewDone = () => {
    try {
      localStorage.setItem(REVIEW_DONE_KEY, "self_reported");
    } catch {}
    setShowReviewPrompt(false);
  };

  const handleReviewDismiss = () => {
    try {
      localStorage.setItem(REVIEW_DISMISSED_KEY, Date.now().toString());
    } catch {}
    setShowReviewPrompt(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome tip */}
      {showWelcomeTip && (
        <div className="relative rounded-2xl border border-brand/20 bg-card/90 backdrop-blur p-4 shadow-card text-left">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(WELCOME_DISMISS_KEY, "1");
              } catch {}
              setShowWelcomeTip(false);
            }}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-foreground pr-8 mb-2">
            Hızlı başlangıç
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 mb-3 list-disc list-inside">
            <li>
              <strong className="text-foreground">Diyetlerim:</strong> güncel planlarınız ve geçmiş kayıtlar
            </li>
            <li>
              <strong className="text-foreground">Sohbetlerim:</strong> diyetisyeninizle mesajlaşma
            </li>
            <li className="flex flex-wrap items-center gap-1">
              <Bell className="w-3.5 h-3.5 inline text-brand shrink-0" />
              <span>
                Bildirimler için{" "}
                <Link
                  href="/client/settings"
                  className="text-brand font-medium hover:underline"
                >
                  ayarlara
                </Link>{" "}
                göz atın
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* Welcome header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Hoş Geldiniz, {userName}!
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Beslenme programlarınıza göz atın ve diyetisyeninizle iletişime geçin
        </p>
      </div>

      {/* Main action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Diets Card */}
        <Link
          href="/client/diets"
          className="bg-card rounded-2xl shadow-card border-2 border-transparent hover:border-brand/40 hover:-translate-y-0.5 hover:shadow-lg p-6 transition-all cursor-pointer group"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-brand-gradient rounded-xl flex items-center justify-center mb-4 shadow-card">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              Diyetlerim
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Beslenme programlarınızı görüntüleyin
            </p>
            <div className="flex items-center text-brand font-medium text-sm">
              Görüntüle
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Messages Card */}
        <Link
          href="/client/conversations"
          className="bg-card rounded-2xl shadow-card border-2 border-transparent hover:border-brand/40 hover:-translate-y-0.5 hover:shadow-lg p-6 transition-all cursor-pointer group relative"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-brand-gradient rounded-xl flex items-center justify-center mb-4 relative shadow-card">
              <MessageCircle className="w-8 h-8 text-white" />
              {unreadData.totalUnread > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-card shadow">
                  {unreadData.totalUnread > 9 ? "9+" : unreadData.totalUnread}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              Sohbetlerim
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {unreadData.totalUnread > 0
                ? `${unreadData.totalUnread} yeni mesajınız var`
                : "Tüm sohbetlerinizi görüntüleyin"}
            </p>
            <div className="flex items-center text-brand font-medium text-sm">
              Görüntüle
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Milestone review prompt — shown after 7 days */}
      {showReviewPrompt && (
        <div className="relative bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/30 rounded-2xl p-5 shadow-card">
          <button
            type="button"
            onClick={handleReviewDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:bg-warning/10 hover:text-foreground transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4 pr-6">
            <div className="w-10 h-10 bg-warning/15 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <Star className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground mb-0.5">
                Deneyiminizi paylaşır mısınız?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Doğru diyetisyeni arayan birileri için Google yorumunuz çok
                değerli olur. 1-2 cümle yeterli!
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleReviewClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-warning hover:bg-warning/90 text-warning-foreground text-sm font-medium rounded-xl transition-colors shadow-card"
                >
                  <Star className="w-3.5 h-3.5" />
                  Google&apos;da Değerlendir
                </button>
                <button
                  onClick={handleReviewDone}
                  className="px-4 py-2 bg-card hover:bg-accent text-foreground text-sm font-medium rounded-xl border border-border transition-colors"
                >
                  Yorumumu zaten yaptım
                </button>
                <button
                  onClick={handleReviewDismiss}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Daha sonra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Web & Google review quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={DIETITIAN_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-card rounded-xl border border-border hover:border-brand/40 hover:shadow-card p-4 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-soft flex items-center justify-center">
                <Globe className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Web Sitemiz
                </p>
                <p className="text-xs text-muted-foreground">
                  Programlar ve danışmanlık bilgileri
                </p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand transition-colors" />
          </div>
        </a>

        <Link
          href="/client/review"
          className="bg-card rounded-xl border border-border hover:border-warning/40 hover:shadow-card p-4 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
                <Star className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Yorum & Paylaş
                </p>
                <p className="text-xs text-muted-foreground">
                  Google yorumu bırakın veya önerin
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-warning transition-colors" />
          </div>
        </Link>
      </div>

      {/* Logout */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-destructive bg-card hover:bg-destructive/10 border border-border hover:border-destructive/30 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
