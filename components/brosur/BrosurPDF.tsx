"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { ensurePdfMake } from "@/lib/pdfmake";
import { prepareBrosurContent, BrosurContent } from "@/lib/brosur-generator";

interface BrosurPDFProps {
  onGenerate?: () => void;
}

export function BrosurPDF({ onGenerate }: BrosurPDFProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<BrosurContent | null>(null);

  useEffect(() => {
    // İçeriği önceden yükle
    prepareBrosurContent()
      .then(setContent)
      .catch((error) => {
        console.error("Broşür içeriği yüklenemedi:", error);
      });
  }, []);

  const generatePDF = async () => {
    if (!content) {
      alert("Broşür içeriği henüz yüklenmedi. Lütfen bekleyin.");
      return;
    }

    try {
      setIsLoading(true);
      const pdfMake = await ensurePdfMake();

      // A5 boyutu: 148 x 210 mm = 419.53 x 595.28 points
      const pageWidth = 419.53;
      const pageHeight = 595.28;
      const margin = 18;

      const docDefinition: any = {
        pageSize: { width: pageWidth, height: pageHeight },
        pageMargins: [margin, margin, margin, margin],
        defaultStyle: {
          font: "Roboto",
          fontSize: 8,
          color: "#1a1a1a",
        },
        styles: {
          header: {
            fontSize: 16,
            bold: true,
            color: "#4f46e5",
            alignment: "center",
            margin: [0, 0, 0, 3],
          },
          subheader: {
            fontSize: 8,
            color: "#6b7280",
            alignment: "center",
            margin: [0, 0, 0, 8],
          },
          title: {
            fontSize: 10,
            bold: true,
            color: "#1f2937",
            margin: [0, 5, 0, 3],
          },
          feature: {
            fontSize: 8,
            color: "#374151",
            margin: [0, 2, 0, 2],
          },
          instruction: {
            fontSize: 8,
            color: "#4b5563",
            margin: [0, 1, 0, 1],
          },
          highlight: {
            fontSize: 8,
            bold: true,
            color: "#4f46e5",
            margin: [0, 4, 0, 2],
          },
          infoText: {
            fontSize: 7,
            color: "#1f2937",
            margin: [0, 2, 0, 2],
          },
        },
        content: [
          // Logo
          {
            image: content.logoDataUrl,
            width: 112,
            alignment: "center",
            margin: [0, 0, 0, 4],
          },
          // Başlık
          {
            text: "Danışan Portalını Telefona Kurun",
            style: "header",
          },
          {
            text: "iOS ve Android için hızlı PWA kurulumu",
            style: "subheader",
          },
          // QR Kod
          {
            image: content.qrCodeDataUrl,
            width: 82,
            alignment: "center",
            margin: [0, 5, 0, 3],
          },
          {
            text: "QR kodu tarayıp giriş ekranını açın",
            fontSize: 8,
            alignment: "center",
            color: "#6b7280",
            margin: [0, 0, 0, 7],
          },
          // Kurulum Talimatları
          {
            text: "Kurulum Talimatları",
            style: "title",
          },
          // iOS
          {
            text: "iOS (iPhone/iPad):",
            fontSize: 8,
            bold: true,
            color: "#4f46e5",
            margin: [0, 2, 0, 1],
          },
          {
            ul: [
              "Bağlantıyı Safari ile açın",
              "Alt menüden Paylaş simgesine dokunun",
              '"Ana Ekrana Ekle" seçeneğini seçip Ekle deyin',
              "Ana ekrandan açıp telefon numarasıyla giriş yapın",
            ],
            fontSize: 7,
            color: "#4b5563",
            margin: [10, 0, 0, 4],
          },
          // Android
          {
            text: "Android:",
            fontSize: 8,
            bold: true,
            color: "#4f46e5",
            margin: [0, 2, 0, 1],
          },
          {
            ul: [
              "Bağlantıyı Chrome ile açın",
              '"Uygulamayı Yükle / Ana ekrana ekle" seçeneğini kullanın',
              '"Ana ekrana ekle / Yükle" onayını verin',
              "Ana ekrandan açıp telefon numarasıyla giriş yapın",
            ],
            fontSize: 7,
            color: "#4b5563",
            margin: [10, 0, 0, 5],
          },
          // Uygulama Özellikleri
          {
            text: "Uygulama Özellikleri",
            style: "title",
          },
          {
            ul: [
              "Öğün hatırlatıcıları ve günlük bildirimler",
              "Telefon numarası ile hızlı danışan girişi",
              "Diyet programlarını görüntüleme",
              "Diyetisyenle gerçek zamanlı mesajlaşma",
              "Öğün fotoğrafı gönderme",
              "Kilo/ölçü takibi ve ilerleme grafikleri",
            ],
            fontSize: 7,
            color: "#374151",
            margin: [10, 0, 0, 5],
          },
          // Diyetisyen Onayı Bilgisi
          {
            text: "Önemli Bilgi",
            style: "highlight",
          },
          {
            table: {
              widths: ["*"],
              body: [
                [
                  {
                    text: "Sisteme kayıtlı telefon numaranız ile giriş yapın. Numaranız sistemde yoksa veya eşleşme bulunamazsa diyetisyeninizle iletişime geçin.",
                    style: "infoText",
                    alignment: "left",
                    fillColor: "#eef2ff",
                    margin: [6, 4, 6, 4],
                  },
                ],
              ],
            },
            layout: "noBorders",
            margin: [0, 0, 0, 4],
          },
          // İletişim
          {
            text: "Sorularınız için diyetisyeninizle iletişime geçin",
            fontSize: 8,
            color: "#6b7280",
            alignment: "center",
            margin: [0, 4, 0, 0],
            italics: true,
          },
        ],
      };

      pdfMake.createPdf(docDefinition).download("pwa-kurulum-brosuru.pdf");
      
      if (onGenerate) {
        onGenerate();
      }
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      alert("PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={isLoading || !content}
      className="w-full sm:w-auto"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          PDF Oluşturuluyor...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          PDF İndir
        </>
      )}
    </Button>
  );
}
