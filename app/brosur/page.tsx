"use client";

import { BrosurPDF } from "@/components/brosur/BrosurPDF";
import { ReviewPosterPDF } from "@/components/reviews/ReviewPosterPDF";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Smartphone, CheckCircle2, MessageCircle, Camera, BarChart3, Calendar, Star } from "lucide-react";

export default function BrosurPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">
            PWA Kurulum Broşürü
          </h1>
          <p className="text-lg text-muted-foreground">
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
            <div className="bg-card p-6 rounded-lg border-2 border-dashed border-border min-h-[600px]">
              {/* Logo */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/ezgi_evgin.png" 
                  alt="Ezgi Evgin Logo" 
                  className="h-16 object-contain"
                />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-brand text-center mb-2">
                Danışan Portalını Telefona Kurun
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                iOS ve Android için hızlı PWA kurulumu
              </p>

              {/* QR Code Placeholder */}
              <div className="flex justify-center mb-4">
                <div className="w-32 h-32 border-2 border-border rounded-lg flex items-center justify-center bg-muted/30">
                  <QrCode className="w-16 h-16 text-muted-foreground/70" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mb-8">
                QR kodu tarayıp giriş ekranını açın
              </p>

              {/* Installation Instructions */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground mb-3">
                  Kurulum Talimatları
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-brand mb-1">
                      iOS (iPhone/iPad):
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                      <li>Bağlantıyı Safari ile açın</li>
                      <li>Paylaş simgesine dokunun</li>
                      <li>"Ana Ekrana Ekle" seçeneğini seçip Ekle deyin</li>
                      <li>Ana ekrandaki uygulama ikonundan açın</li>
                      <li>Telefon numaranızla giriş yapın</li>
                      <li>Bildirim sorulduğunda İzin Ver seçin</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand mb-1">
                      Android:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                      <li>Bağlantıyı Chrome ile açın</li>
                      <li>Yükle simgesini veya menüdeki "Uygulamayı yükle" seçeneğini kullanın</li>
                      <li>"Ana ekrana ekle / Yükle" onayını verin</li>
                      <li>Ana ekrandaki uygulama ikonundan açın</li>
                      <li>Telefon numaranızla giriş yapın</li>
                      <li>Bildirim sorulduğunda İzin Ver seçin</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground mb-3">
                  Uygulama Özellikleri
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Öğün hatırlatıcıları ve günlük bildirimler</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Smartphone className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span>Telefon numarası ile hızlı danışan girişi</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Diyet programlarını görüntüleme</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MessageCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>Diyetisyenle gerçek zamanlı mesajlaşma</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Camera className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                    <span>Öğün fotoğrafı gönderme</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <BarChart3 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>Kilo, ölçü takibi ve ilerleme grafikleri</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Smartphone className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span>Fiziksel aktivite kaydı</span>
                  </div>
                </div>
              </div>

              {/* Important Info */}
              <div className="bg-brand-soft border border-indigo-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-indigo-900 mb-2">
                  Önemli Bilgi
                </p>
                <p className="text-xs text-foreground">
                  Sisteme kayıtlı telefon numaranız ile giriş yapın. Numaranız
                  sistemde yoksa veya eşleşme bulunamazsa diyetisyeninizle
                  iletişime geçin.
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-6 italic">
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

        <Card className="shadow-lg mt-6 border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-600" />
              Google Yorum Posteri
            </CardTitle>
            <CardDescription>
              Ofise asmak için A4 boyutunda, QR kodlu yorum çağrısı.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div className="rounded-lg border border-amber-200 bg-white p-5">
                <p className="text-lg font-bold text-foreground mb-2">
                  Deneyiminizi Google'da Paylaşın
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Danışanlar QR kodu okutup doğrudan Google yorum ekranına
                  gidebilir.
                </p>
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <QrCode className="w-4 h-4" />
                  <span>QR kod otomatik olarak Google yorum linkine gider.</span>
                </div>
              </div>
              <div className="md:min-w-56">
                <ReviewPosterPDF />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
