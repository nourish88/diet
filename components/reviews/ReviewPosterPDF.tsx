"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateQRCode, loadLogoAsDataUrl } from "@/lib/brosur-generator";
import { ensurePdfMake } from "@/lib/pdfmake";
import { GOOGLE_REVIEW_URL } from "@/lib/site-urls";

interface ReviewPosterContent {
  logoDataUrl: string;
  qrCodeDataUrl: string;
}

export function ReviewPosterPDF() {
  const [content, setContent] = useState<ReviewPosterContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      loadLogoAsDataUrl("/ezgi_evgin.png"),
      generateQRCode(GOOGLE_REVIEW_URL, 360),
    ])
      .then(([logoDataUrl, qrCodeDataUrl]) => {
        setContent({ logoDataUrl, qrCodeDataUrl });
      })
      .catch((error) => {
        console.error("Yorum posteri içeriği yüklenemedi:", error);
      });
  }, []);

  const generatePDF = async () => {
    if (!content) {
      alert("Poster içeriği henüz yüklenmedi. Lütfen bekleyin.");
      return;
    }

    try {
      setIsLoading(true);
      const pdfMake = await ensurePdfMake();

      const docDefinition: any = {
        pageSize: "A4",
        pageMargins: [36, 40, 36, 36],
        defaultStyle: {
          font: "Roboto",
          color: "#1f2937",
        },
        background: [
          {
            canvas: [
              {
                type: "rect",
                x: 0,
                y: 0,
                w: 595.28,
                h: 841.89,
                color: "#f8fafc",
              },
              {
                type: "rect",
                x: 34,
                y: 34,
                w: 527,
                h: 774,
                r: 18,
                color: "#ffffff",
                lineColor: "#e5e7eb",
              },
            ],
          },
        ],
        content: [
          {
            image: content.logoDataUrl,
            width: 150,
            alignment: "center",
            margin: [0, 8, 0, 30],
          },
          {
            text: "Deneyiminizi Google'da Paylaşın",
            alignment: "center",
            bold: true,
            fontSize: 30,
            color: "#111827",
            margin: [24, 0, 24, 12],
          },
          {
            text: "Yorumunuz, sağlıklı bir başlangıç arayan başka kişilere yol gösterir.",
            alignment: "center",
            fontSize: 15,
            color: "#4b5563",
            margin: [54, 0, 54, 28],
          },
          {
            table: {
              widths: ["*"],
              body: [
                [
                  {
                    image: content.qrCodeDataUrl,
                    width: 235,
                    alignment: "center",
                    margin: [18, 18, 18, 18],
                    fillColor: "#ffffff",
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => "#d1d5db",
              vLineColor: () => "#d1d5db",
            },
            margin: [118, 0, 118, 18],
          },
          {
            text: "Kameranızla QR kodu okutun",
            alignment: "center",
            bold: true,
            fontSize: 18,
            color: "#111827",
            margin: [0, 0, 0, 8],
          },
          {
            text: "Açılan Google sayfasında yıldızınızı seçip kısa bir yorum yazabilirsiniz.",
            alignment: "center",
            fontSize: 13,
            color: "#4b5563",
            margin: [50, 0, 50, 34],
          },
          {
            table: {
              widths: ["*"],
              body: [
                [
                  {
                    text: "1 dakika ayırmanız bizim için çok kıymetli. Teşekkür ederiz.",
                    alignment: "center",
                    bold: true,
                    fontSize: 14,
                    color: "#92400e",
                    fillColor: "#fef3c7",
                    margin: [14, 12, 14, 12],
                  },
                ],
              ],
            },
            layout: "noBorders",
            margin: [56, 0, 56, 0],
          },
        ],
      };

      pdfMake.createPdf(docDefinition).download("google-yorum-posteri.pdf");
    } catch (error) {
      console.error("Yorum posteri PDF hatası:", error);
      alert("PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={generatePDF} disabled={isLoading || !content} className="w-full sm:w-auto">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Hazırlanıyor...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Yorum Posterini İndir
          <Printer className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
