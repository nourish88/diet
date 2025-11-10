"use client";

import { BrosurPDF } from "@/components/brosur/BrosurPDF";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Smartphone, CheckCircle2, MessageCircle, Camera, BarChart3, Calendar } from "lucide-react";

export default function BrosurPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">
            PWA Kurulum Broşürü
          </h1>
          <p className="text-lg text-gray-600">
            Danışanlarınız için hazır broşürü indirin ve yazdırın
          </p>
        </div>

        {/* Preview Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Broşür Önizleme</CardTitle>
            <CardDescription>
              A5 boyutunda, tek yüz broşür. Yazdırılabilir PDF formatında.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 min-h-[600px]">
              {/* Logo */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/ezgi_evgin.png" 
                  alt="Ezgi Evgin Logo" 
                  className="h-16 object-contain"
                />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-indigo-600 text-center mb-2">
                Mobil Uygulamayı Kurun
              </h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                Beslenme programınıza kolayca erişin
              </p>

              {/* QR Code Placeholder */}
              <div className="flex justify-center mb-4">
                <div className="w-32 h-32 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mb-8">
                QR Kodu tarayarak kayıt olun
              </p>

              {/* Installation Instructions */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Kurulum Talimatları
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-indigo-600 mb-1">
                      iOS (iPhone/iPad):
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Safari'de sayfayı açın</li>
                      <li>Paylaş butonuna basın</li>
                      <li>"Ana Ekrana Ekle" seçeneğini seçin</li>
                      <li>Uygulamayı açın</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-600 mb-1">
                      Android:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Chrome'da sayfayı açın</li>
                      <li>Menüden "Ana ekrana ekle" seçin</li>
                      <li>Uygulamayı açın</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Uygulama Özellikleri
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Öğün hatırlatıcıları (30 dakika önce bildirim)</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Calendar className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Diyet programlarını görüntüleme</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <MessageCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>Diyetisyenle gerçek zamanlı mesajlaşma</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Camera className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                    <span>Öğün fotoğrafı gönderme</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <BarChart3 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>Kilo, ölçü takibi ve ilerleme grafikleri</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Smartphone className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span>Fiziksel aktivite kaydı</span>
                  </div>
                </div>
              </div>

              {/* Important Info */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-indigo-900 mb-2">
                  Önemli Bilgi
                </p>
                <p className="text-xs text-gray-700">
                  Kayıt olduktan sonra diyetisyeninizin onayını bekleyin. Onaylandıktan sonra uygulamayı kullanmaya başlayabilirsiniz.
                </p>
              </div>

              <p className="text-xs text-gray-500 text-center mt-6 italic">
                Sorularınız için diyetisyeninizle iletişime geçin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Download Button Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>PDF İndir</CardTitle>
            <CardDescription>
              Broşürü PDF formatında indirin ve yazdırın
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <BrosurPDF />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

