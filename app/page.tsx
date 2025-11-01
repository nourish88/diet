"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";

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

export default function Home() {
  const router = useRouter();
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (userRole === "dietitian") {
      const interval = setInterval(loadUnreadMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const checkAuthAndLoadData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("⚠️ No session found, redirecting to login");
        router.push("/login");
        return;
      }

      // Get user role
      const userResponse = await fetch("/api/auth/sync", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const role = userData.user.role;

        console.log("🔍 User role detected:", role);

        // Set role and load data based on role
        if (role === "client") {
          // Client should not see this page - redirect from client layout handles this
          console.log("⚠️ Client on dietitian page, should not happen");
          // Don't redirect here to avoid loop - let client layout handle it
          setUserRole(role);
          setLoading(false);
        } else if (role === "dietitian") {
          console.log("👨‍⚕️ Dietitian detected, loading dashboard");
          setUserRole(role);
          setLoading(false); // Stop loading for dietitian
          // Load unread messages for dietitian
          loadUnreadMessages();
        } else {
          // Unknown role
          setUserRole(role);
          setLoading(false);
        }
      } else {
        // Auth failed, redirect to login
        setLoading(false);
        router.push("/login");
      }
    } catch (error) {
      console.error("❌ Error checking auth:", error);
      setLoading(false);
      router.push("/login");
    }
  };

  const loadUnreadMessages = async () => {
    try {
      // Get Supabase session for auth token
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("⚠️ No session found, skipping unread messages");
        return;
      }

      const response = await fetch("/api/unread-messages/list", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`, // ← SORUN BURADA EKSİKTİ!
        },
      });

      if (!response.ok) {
        console.log("❌ API Error:", response.status);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations || []);
        setTotalUnread(data.totalUnread || 0);
        console.log("✅ Unread messages loaded:", data.totalUnread);
      }
    } catch (error) {
      console.error("❌ Error loading unread messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // If loading, show minimal loading screen
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // If not dietitian, show error message
  if (userRole && userRole !== "dietitian") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Erişim Reddedildi
          </h1>
          <p className="text-gray-600 mb-6">
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
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <Image
            src="/ezgi_evgin.png"
            alt="Diyet Danışmanlık Logo"
            width={180}
            height={180}
            priority
          />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 text-transparent bg-clip-text mb-4">
          Diyet Danışmanlık Hizmetleri
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Danışanlarınız için kişiye özel beslenme programları oluşturun,
          saklayın ve yönetin.
        </p>
      </div>

      {/* Okunmamış Mesajlar Section */}
      {!loading && conversations.length > 0 && (
        <div className="mb-16">
          <div className="bg-white rounded-lg shadow-md border-2 border-purple-700 overflow-hidden">
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
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/clients/${conversation.clientId}/messages?dietId=${conversation.dietId}`
                      )
                    }
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {conversation.clientName}
                        </h3>
                        <span className="text-sm text-gray-500">
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
                        <p className="text-sm text-gray-600 line-clamp-1 flex-1">
                          {conversation.messages[0].content}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatTime(conversation.messages[0].createdAt)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
              {conversations.length > 5 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    +{conversations.length - 5} daha fazla sohbet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-white rounded-lg shadow-md border-2 border-purple-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
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
              <p className="text-gray-700">
                Danışanlarınızın bilgilerini kaydedin, görüntüleyin ve
                düzenleyin. Her danışan için beslenme programı geçmişini takip
                edin.
              </p>
              <ul className="list-disc pl-5 text-gray-600">
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
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Yeni Danışan Ekle
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border-2 border-purple-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
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
              <p className="text-gray-700">
                Danışanlarınız için detaylı beslenme programları oluşturun,
                öğünler ekleyin ve PDF olarak çıktı alın.
              </p>
              <ul className="list-disc pl-5 text-gray-600">
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
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
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
        <div className="bg-white rounded-lg shadow-md border-2 border-purple-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
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
                <h3 className="text-xl font-medium text-gray-800 flex items-center mb-4">
                  <Coffee className="w-5 h-5 mr-2 text-indigo-600" />
                  Besinler
                </h3>
                <div className="space-y-4 mb-6">
                  <p className="text-gray-700">
                    Beslenme programlarında kullanabileceğiniz besinleri
                    yönetin.
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
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
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Yeni Besin Ekle
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 flex items-center mb-4">
                  <List className="w-5 h-5 mr-2 text-indigo-600" />
                  Besin Grupları
                </h3>
                <div className="space-y-4 mb-6">
                  <p className="text-gray-700">
                    Besinleri kategorize etmek için gruplar oluşturun ve
                    yönetin.
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
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
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="space-y-4">
            <div className="h-12 w-12 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Önemli Tarihler
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Özel günleri ve kutlamaları yönetin
              </p>
            </div>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>Özel günleri ekleyin</li>
              <li>Kutlama mesajlarını düzenleyin</li>
              <li>Tarih aralıklarını belirleyin</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push("/important-dates")}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Önemli Tarihleri Yönet
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-gray-500 text-sm">
        <p>
          © {new Date().getFullYear()} Diet Management System. Tüm hakları
          saklıdır.
        </p>
      </div>
    </div>
  );
}
