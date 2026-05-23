"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  ClipboardList,
  PlusCircle,
  Apple,
  List,
  Coffee,
  Calendar,
  MessageCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface UnreadConversation {
  clientId: number;
  clientName: string;
  dietId: number;
  dietDate: string | null;
  unreadCount: number;
  messages: Array<{
    id: number;
    content: string;
    createdAt: string;
    ogun: {
      id: number;
      name: string;
    } | null;
  }>;
}

interface DashboardStats {
  totalClients: number;
  totalDiets: number;
  thisMonthDiets: number;
  periodDiets?: number;
  pendingApprovals: number;
}

interface RecentDiet {
  id: number;
  tarih: string;
  client: {
    id: number;
    name: string;
    surname: string;
  };
}

interface UnreadMessagesByDiet {
  [dietId: string]: number;
}

export default function Home() {
  const router = useRouter();
  const { user, databaseUser, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  
  // Mobile dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentDiets, setRecentDiets] = useState<RecentDiet[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [unreadByDiet, setUnreadByDiet] = useState<UnreadMessagesByDiet>({});
  const [timeRange, setTimeRange] = useState("current_month");
  
  // Get user role from databaseUser
  const userRole = databaseUser?.role || null;

  const loadDashboardData = useCallback(async () => {
    try {
      setStatsLoading(true);

      // Load dashboard stats
      const statsData = await apiClient.get<DashboardStats>(`/analytics/stats?timeRange=${timeRange}`);
      setDashboardStats({
        totalClients: statsData.totalClients || 0,
        totalDiets: statsData.totalDiets || 0,
        thisMonthDiets: statsData.periodDiets ?? statsData.thisMonthDiets ?? 0,
        pendingApprovals: statsData.pendingApprovals || 0,
      });

      // Load recent diets
      const dietsData = await apiClient.get<{ diets: RecentDiet[] }>("/diets?skip=0&take=5");
      setRecentDiets(dietsData.diets || []);
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [timeRange]);

  const loadUnreadMessages = useCallback(async () => {
    try {
      const data = await apiClient.get<{
        success: boolean;
        conversations: UnreadConversation[];
        totalUnread: number;
      }>("/unread-messages/list");

      if (data.success) {
        setConversations(data.conversations || []);
        setTotalUnread(data.totalUnread || 0);
        console.log("✅ Unread messages loaded:", data.totalUnread);
        
        // Build unread by diet map
        const dietMap: UnreadMessagesByDiet = {};
        if (data.conversations && Array.isArray(data.conversations)) {
          data.conversations.forEach((conv: UnreadConversation) => {
            dietMap[conv.dietId] = conv.unreadCount || 0;
          });
        }
        setUnreadByDiet(dietMap);
      }
    } catch (error) {
      console.error("❌ Error loading unread messages:", error);
    }
  }, []);

  // Load data when auth is ready and user is dietitian
  useEffect(() => {
    if (!authLoading && user && databaseUser) {
      if (databaseUser.role === "dietitian") {
        loadDashboardData();
        loadUnreadMessages();
      } else if (databaseUser.role === "client") {
        // Client should not see this page - redirect to client page
        router.push("/client");
      }
    } else if (!authLoading && !user) {
      // No user, redirect to login
      router.push("/account");
    }
  }, [authLoading, user, databaseUser, router, loadDashboardData, loadUnreadMessages]);

  // Set up polling for dietitian dashboard
  useEffect(() => {
    if (userRole === "dietitian") {
      const interval = setInterval(() => {
        loadUnreadMessages();
        loadDashboardData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole, loadUnreadMessages, loadDashboardData]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // If auth is loading, show minimal loading screen
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // If not dietitian, show error message
  if (userRole && userRole !== "dietitian") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-card rounded-2xl shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Erişim Reddedildi
          </h1>
          <p className="text-muted-foreground mb-6">
            Bu sayfa sadece diyetisyenler içindir.
          </p>
          <a
            href="/client"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Danışan Paneline Git
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Mobile Dashboard Features - Üst Bölüm */}
      <div className="mb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-semibold text-foreground">Genel Durum</h2>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Zaman Aralığı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">İçinde Bulunulan Ay</SelectItem>
              <SelectItem value="24h">Son 24 Saat</SelectItem>
              <SelectItem value="7d">Son 7 Gün</SelectItem>
              <SelectItem value="30d">Son 30 Gün</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-card rounded-xl shadow-md p-4 md:p-6 animate-pulse"
              >
                <div className="h-8 w-8 md:h-10 md:w-10 bg-muted rounded-full mb-3 md:mb-4 mx-auto"></div>
                <div className="h-6 md:h-8 bg-muted rounded mb-2"></div>
                <div className="h-3 md:h-4 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {/* Toplam Danışan */}
            <div className="bg-card rounded-xl shadow-md p-4 md:p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-center mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {dashboardStats?.totalClients || 0}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">
                  Toplam Danışan
                </div>
              </div>
            </div>

            {/* Toplam Diyet */}
            <div className="bg-card rounded-xl shadow-md p-4 md:p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-center mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-green-50 rounded-full flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {dashboardStats?.totalDiets || 0}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">
                  Toplam Diyet
                </div>
              </div>
            </div>

            {/* Bu Ay / Seçili Dönem */}
            <div className="bg-card rounded-xl shadow-md p-4 md:p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-center mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-50 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {dashboardStats?.thisMonthDiets || 0}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">Seçili Dönem (Diyet)</div>
              </div>
            </div>

            {/* Bekleyen */}
            <div className="bg-card rounded-xl shadow-md p-4 md:p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-center mb-3 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {dashboardStats?.pendingApprovals || 0}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">
                  Bekleyen
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Okunmamış Mesajlar Card - Mobile Style */}
        <div
          className="bg-card rounded-xl shadow-md p-4 md:p-6 mb-6 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            if (conversations.length > 0) {
              router.push(
                `/clients/${conversations[0].clientId}/messages?dietId=${conversations[0].dietId}`
              );
            } else if (totalUnread > 0) {
              // If there are unread messages but no conversations in list, go to first client
              router.push("/clients");
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Okunmamış Mesajlar
                </h3>
                <p className="text-sm text-muted-foreground">
                  {totalUnread > 0
                    ? `${totalUnread} yeni mesajınız var`
                    : "Okunmamış mesajınız yok"}
                </p>
              </div>
            </div>
            {totalUnread > 0 && (
              <div className="bg-red-500 text-white rounded-full px-3 py-1 text-sm font-bold min-w-[32px] text-center">
                {totalUnread}
              </div>
            )}
          </div>
        </div>

        {/* Son Diyetler */}
        {recentDiets.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4">
              Son Diyetler
            </h2>
            <div className="space-y-3">
              {recentDiets.map((diet) => {
                const dietUnreadCount = unreadByDiet[diet.id] || 0;
                return (
                  <div
                    key={diet.id}
                    className="bg-card rounded-xl shadow-md p-3 md:p-4 flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/diets/${diet.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm md:text-base truncate">
                          {diet.client.name} {diet.client.surname}
                        </h3>
                        {dietUnreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                            {dietUnreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        Beslenme Programı #{diet.id} • {diet.tarih}
                      </p>
                    </div>
                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground/70 flex-shrink-0 ml-2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-border my-16"></div>

      {/* Mevcut Web İçeriği - Alt Bölüm */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold bg-brand-gradient text-transparent bg-clip-text mb-4">
          Diyet Danışmanlık Hizmetleri
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Danışanlarınız için kişiye özel beslenme programları oluşturun,
          saklayın ve yönetin.
        </p>
      </div>

      {/* Okunmamış Mesajlar Section */}
      {!authLoading && conversations.length > 0 && (
        <div className="mb-16">
          <div className="bg-card rounded-lg shadow-md border-2 border-purple-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 flex items-center">
                    <MessageCircle className="w-6 h-6 mr-2" />
                    Okunmamış Mesajlar
                  </h2>
                  <p className="text-purple-100">
                    {totalUnread} okunmamış mesajınız var
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {conversations.slice(0, 5).map((conversation) => (
                  <div
                    key={`${conversation.clientId}-${conversation.dietId}`}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/clients/${conversation.clientId}/messages?dietId=${conversation.dietId}`
                      )
                    }
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {conversation.clientName}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          Diyet #{conversation.dietId}
                        </span>
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        {conversation.messages[0].ogun && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                            📍 {conversation.messages[0].ogun.name}
                          </span>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-1 flex-1">
                          {conversation.messages[0].content}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                          <Clock className="w-3 h-3" />
                          {formatTime(conversation.messages[0].createdAt)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/70" />
                  </div>
                ))}
              </div>
              {conversations.length > 5 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    +{conversations.length - 5} daha fazla sohbet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-card rounded-lg shadow-md border-2 border-purple-700 overflow-hidden">
          <div className="bg-brand-gradient p-6 text-white">
            <h2 className="text-2xl font-semibold mb-2 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Danışan Yönetimi
            </h2>
            <p className="text-blue-100">
              Danışanlarınızın bilgilerini kaydedin ve yönetin
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <p className="text-foreground">
                Danışanlarınızın bilgilerini kaydedin, görüntüleyin ve
                düzenleyin. Her danışan için beslenme programı geçmişini takip
                edin.
              </p>
              <ul className="list-disc pl-5 text-muted-foreground">
                <li>Danışan kayıtları oluşturun</li>
                <li>İletişim bilgilerini saklayın</li>
                <li>Notlar ekleyin</li>
                <li>Danışan bazlı beslenme programları görüntüleyin</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push("/clients")}
                variant="outline"
                className="flex-1 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                <Users className="w-4 h-4 mr-2" />
                Danışanları Görüntüle
              </Button>
              <Button
                onClick={() => router.push("/clients/new")}
                className="flex-1 bg-brand-gradient hover:opacity-90 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Yeni Danışan Ekle
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md border-2 border-purple-700 overflow-hidden">
          <div className="bg-brand-gradient p-6 text-white">
            <h2 className="text-2xl font-semibold mb-2 flex items-center">
              <ClipboardList className="w-6 h-6 mr-2" />
              Beslenme Programları
            </h2>
            <p className="text-blue-100">
              Kişiye özel beslenme programları oluşturun
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <p className="text-foreground">
                Danışanlarınız için detaylı beslenme programları oluşturun,
                öğünler ekleyin ve PDF olarak çıktı alın.
              </p>
              <ul className="list-disc pl-5 text-muted-foreground">
                <li>Öğün bazlı planlama yapın</li>
                <li>Besin ve miktar bilgilerini ekleyin</li>
                <li>Programları PDF olarak dışa aktarın</li>
                <li>Geçmiş programlara erişin</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push("/diets")}
                variant="outline"
                className="flex-1 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Programları Görüntüle
              </Button>
              <Button
                onClick={() => router.push("/diets/new")}
                className="flex-1 bg-brand-gradient hover:opacity-90 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Yeni Program Oluştur
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Besin Yönetimi Section */}
      <div className="mb-16">
        <div className="bg-card rounded-lg shadow-md border-2 border-purple-700 overflow-hidden">
          <div className="bg-brand-gradient p-6 text-white">
            <h2 className="text-2xl font-semibold mb-2 flex items-center">
              <Apple className="w-6 h-6 mr-2" />
              Besin Yönetimi
            </h2>
            <p className="text-blue-100">
              Besinleri ve besin gruplarını yönetin
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-medium text-foreground flex items-center mb-4">
                  <Coffee className="w-5 h-5 mr-2 text-indigo-600" />
                  Besinler
                </h3>
                <div className="space-y-4 mb-6">
                  <p className="text-foreground">
                    Beslenme programlarında kullanabileceğiniz besinleri
                    yönetin.
                  </p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    <li>Yeni besinler ekleyin</li>
                    <li>Besinleri düzenleyin</li>
                    <li>Öncelik sırasını ayarlayın</li>
                    <li>Besinleri gruplara atayın</li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => router.push("/besinler")}
                    variant="outline"
                    className="flex-1 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Coffee className="w-4 h-4 mr-2" />
                    Besinleri Görüntüle
                  </Button>
                  <Button
                    onClick={() => router.push("/besinler/new")}
                    className="flex-1 bg-brand-gradient hover:opacity-90 text-white"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Yeni Besin Ekle
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-medium text-foreground flex items-center mb-4">
                  <List className="w-5 h-5 mr-2 text-indigo-600" />
                  Besin Grupları
                </h3>
                <div className="space-y-4 mb-6">
                  <p className="text-foreground">
                    Besinleri kategorize etmek için gruplar oluşturun ve
                    yönetin.
                  </p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    <li>Besin grupları oluşturun</li>
                    <li>Grupları düzenleyin</li>
                    <li>Besinleri gruplara atayın</li>
                    <li>Besin listesini kategorilere göre görüntüleyin</li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => router.push("/besin-gruplari")}
                    variant="outline"
                    className="flex-1 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                  >
                    <List className="w-4 h-4 mr-2" />
                    Grupları Görüntüle
                  </Button>
                  <Button
                    onClick={() => router.push("/besin-gruplari/new")}
                    className="flex-1 bg-brand-gradient hover:opacity-90 text-white"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Yeni Grup Ekle
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="text-center text-muted-foreground text-sm">
        <p>
          © {new Date().getFullYear()} Diet Management System. Tüm hakları
          saklıdır.
        </p>
      </div>
    </div>
  );
}
