"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Users,
  ClipboardList,
  PlusCircle,
  Apple,
  List,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfficeSocialMediaPlanner } from "@/components/OfficeSocialMediaPlanner";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const router = useRouter();
  const { user, databaseUser, loading: authLoading } = useAuth();

  // Get user role from databaseUser
  const userRole = databaseUser?.role || null;

  // Redirect non-dietitians away from the dashboard.
  useEffect(() => {
    if (!authLoading && user && databaseUser) {
      if (databaseUser.role === "client") {
        // Client should not see this page - redirect to client page
        router.push("/client");
      }
    } else if (!authLoading && !user) {
      // No user, redirect to login
      router.push("/account");
    }
  }, [authLoading, user, databaseUser, router]);

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
      {/* Mevcut Web İçeriği */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold bg-brand-gradient text-transparent bg-clip-text mb-4">
          Diyet Danışmanlık Hizmetleri
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Danışanlarınız için kişiye özel beslenme programları oluşturun,
          saklayın ve yönetin.
        </p>
      </div>

      <OfficeSocialMediaPlanner />

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
                className="flex-1 border-indigo-600 text-brand hover:bg-brand-soft"
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
                className="flex-1 border-indigo-600 text-brand hover:bg-brand-soft"
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
                  <Coffee className="w-5 h-5 mr-2 text-brand" />
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
                    className="flex-1 border-indigo-600 text-brand hover:bg-brand-soft"
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
                  <List className="w-5 h-5 mr-2 text-brand" />
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
                    className="flex-1 border-indigo-600 text-brand hover:bg-brand-soft"
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
