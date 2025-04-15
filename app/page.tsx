"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  ClipboardList,
  PlusCircle,
  Apple,
  List,
  Coffee,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

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
              <h3 className="text-lg font-medium text-gray-900">Önemli Tarihler</h3>
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
