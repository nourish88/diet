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
      const margin = 25;

      const docDefinition: any = {
        pageSize: { width: pageWidth, height: pageHeight },
        pageMargins: [margin, margin, margin, margin],
        defaultStyle: {
          font: "Roboto",
          fontSize: 9,
          color: "#1a1a1a",
        },
        styles: {
          header: {
            fontSize: 20,
            bold: true,
            color: "#4f46e5",
            alignment: "center",
            margin: [0, 0, 0, 5],
          },
          subheader: {
            fontSize: 10,
            color: "#6b7280",
            alignment: "center",
            margin: [0, 0, 0, 12],
          },
          title: {
            fontSize: 12,
            bold: true,
            color: "#1f2937",
            margin: [0, 8, 0, 5],
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
            fontSize: 9,
            bold: true,
            color: "#4f46e5",
            margin: [0, 6, 0, 3],
          },
          infoText: {
            fontSize: 8,
            color: "#1f2937",
            margin: [0, 3, 0, 3],
          },
        },
        content: [
          // Logo
          {
            image: content.logoDataUrl,
            width: 50,
            alignment: "center",
            margin: [0, 0, 0, 8],
          },
          // Başlık
          {
            text: "Mobil Uygulamayı Kurun",
            style: "header",
          },
          {
            text: "Beslenme programınıza kolayca erişin",
            style: "subheader",
          },
          // QR Kod
          {
            image: content.qrCodeDataUrl,
            width: 100,
            alignment: "center",
            margin: [0, 8, 0, 5],
          },
          {
            text: "QR Kodu tarayarak kayıt olun",
            fontSize: 9,
            alignment: "center",
            color: "#6b7280",
            margin: [0, 0, 0, 12],
          },
          // Kurulum Talimatları
          {
            text: "Kurulum Talimatları",
            style: "title",
          },
          // iOS
          {
            text: "iOS (iPhone/iPad):",
            fontSize: 9,
            bold: true,
            color: "#4f46e5",
            margin: [0, 3, 0, 2],
          },
          {
            ul: [
              "Safari'de sayfayı açın",
              "Paylaş butonuna basın",
              '"Ana Ekrana Ekle" seçeneğini seçin',
              "Uygulamayı açın",
            ],
            fontSize: 8,
            color: "#4b5563",
            margin: [12, 0, 0, 6],
          },
          // Android
          {
            text: "Android:",
            fontSize: 9,
            bold: true,
            color: "#4f46e5",
            margin: [0, 3, 0, 2],
          },
          {
            ul: [
              "Chrome'da sayfayı açın",
              'Menüden "Ana ekrana ekle" seçin',
              "Uygulamayı açın",
            ],
            fontSize: 8,
            color: "#4b5563",
            margin: [12, 0, 0, 10],
          },
          // Uygulama Özellikleri
          {
            text: "Uygulama Özellikleri",
            style: "title",
          },
          {
            ul: [
              "Öğün hatırlatıcıları (30 dakika önce bildirim)",
              "Diyet programlarını görüntüleme",
              "Diyetisyenle gerçek zamanlı mesajlaşma",
              "Öğün fotoğrafı gönderme",
              "Kilo, ölçü takibi (bel/kalça çevresi, vücut yağ oranı)",
              "Fiziksel aktivite kaydı",
              "İlerleme grafikleri",
            ],
            fontSize: 8,
            color: "#374151",
            margin: [12, 0, 0, 10],
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
                    text: "Kayıt olduktan sonra diyetisyeninizin onayını bekleyin. Onaylandıktan sonra uygulamayı kullanmaya başlayabilirsiniz.",
                    style: "infoText",
                    alignment: "justify",
                    fillColor: "#eef2ff",
                    margin: [8, 6, 8, 6],
                  },
                ],
              ],
            },
            layout: "noBorders",
            margin: [0, 0, 0, 8],
          },
          // İletişim
          {
            text: "Sorularınız için diyetisyeninizle iletişime geçin",
            fontSize: 8,
            color: "#6b7280",
            alignment: "center",
            margin: [0, 8, 0, 0],
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

