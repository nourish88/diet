import { useEffect, useState } from "react";
import { Button, ButtonProps } from "./ui/button";
import { Diet } from "@/types/types";
import {
  Check,
  FileText,
  Loader2,
  X,
  Share,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import twemoji from "twemoji";
import { toast } from "@/components/ui/use-toast";

const formatDateTR = (dateString: string | null | undefined | Date) => {
  if (!dateString) return "Tarih Belirtilmemiş";
  try {
    const date =
      typeof dateString === "string"
        ? new Date(dateString)
        : dateString instanceof Date
        ? dateString
        : new Date();
    return format(date, "d MMMM yyyy", { locale: tr });
  } catch (error) {
    console.error("Date parsing error:", error);
    return "Geçersiz Tarih";
  }
};

const handleWhatsAppShare = async (pdfData: PDFData) => {
  try {
    const apiUrl = `/api/diets/${pdfData.id}/whatsapp`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        responseData.message || "WhatsApp gönderimi başarısız oldu"
      );
    }

    // Open WhatsApp URL in a new window
    if (responseData.whatsappUrl) {
      window.open(responseData.whatsappUrl, "_blank");
    }

    toast({
      title: "Başarılı",
      description: "WhatsApp sayfası açıldı",
      variant: "default",
    });
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });

    toast({
      title: "Hata",
      description: `WhatsApp raporu gönderilirken bir hata oluştu: ${error.message}`,
      variant: "destructive",
    });
  }
};

interface PDFData {
  id?: number;
  fullName: string;
  dietDate: string;
  weeklyResult: string;
  target: string;
  ogunler: {
    name: string;
    time: string;
    menuItems: string[];
    notes: string;
  }[];
  waterConsumption: string;
  physicalActivity: string;
  isBirthdayCelebration?: boolean;
  isImportantDateCelebrated?: boolean;
  importantDate?: {
    message: string;
  };
  dietitianNote?: string;
}

interface DirectPDFButtonProps {
  diet?: Diet;
  pdfData?: PDFData;
  phoneNumber?: string;
  isDietSaved?: boolean;
  dietId?: number;
  disabled?: boolean;
  onError?: (error: string) => void;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: () => void;
}

const DirectPDFButton: React.FC<DirectPDFButtonProps> = ({
  diet,
  pdfData,
  phoneNumber,
  className,
  isDietSaved = false,
  dietId,
  disabled,
  onError,
  variant = "outline",
  size = "sm",
  onClick,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string>("");

  useEffect(() => {
    const loadBackgroundImage = async () => {
      try {
        const response = await fetch("/ezgi_evgin.png");
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setBackgroundDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error loading background image:", error);
      }
    };
    loadBackgroundImage();
  }, []);

  const replaceEmojisWithText = (text: string): string => {
    if (!text) return text;

    const emojiCodeMap: Record<string, string> = {
      ":smile:": "😊",
      ":heart:": "❤️",
      ":fire:": "🔥",
      ":check:": "✅",
      ":x:": "❌",
      ":warning:": "⚠️",
      ":star:": "⭐",
      ":muscle:": "💪",
      ":clap:": "👏",
      ":pray:": "🙏",
      ":clock:": "⏰",
      ":memo:": "📝",
      ":chart:": "📊",
      ":dart:": "🎯",
      ":trophy:": "🏆",
      ":pie:": "🎂",
    };

    let processedText = text;
    Object.entries(emojiCodeMap).forEach(([code, emoji]) => {
      processedText = processedText.replace(new RegExp(code, "g"), emoji);
    });

    processedText = twemoji.parse(processedText, {
      folder: "svg",
      ext: ".svg",
      base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",
    });

    return processedText;
  };

  const handleSuccess = () => {
    toast({
      title: "PDF Başarıyla Oluşturuldu",
      description: "Beslenme programınız indiriliyor...",
      variant: "default",
      duration: 3000,
      action: (
        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-4 w-4 text-green-600" />
        </div>
      ),
    });
  };

  const generatePDF = async () => {
    setIsLoading(true);
    try {
      if (typeof window === "undefined")
        throw new Error(
          "PDF oluşturma işlemi yalnızca tarayıcı ortamında gerçekleştirilebilir"
        );

      await loadPdfMakeScripts();
      if (!window.pdfMake) throw new Error("PDF oluşturma modülü yüklenemedi");
      if (!backgroundDataUrl) throw new Error("Logo yüklenemedi");

      const pdfDataToUse = preparePdfData(diet, pdfData);
      if (!pdfDataToUse) throw new Error("Beslenme programı verisi bulunamadı");

      const docDefinition = createDocDefinition(
        pdfDataToUse,
        backgroundDataUrl
      );
      const fileName = `Beslenme_Programi_${pdfDataToUse.fullName.replace(
        /\s+/g,
        "_"
      )}_${formatDateForFileName(pdfDataToUse.dietDate)}.pdf`;

      window.pdfMake.createPdf(docDefinition).download(fileName);
      handleSuccess();
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      toast({
        title: "Hata",
        description: `PDF oluşturulamadı: ${(error as Error).message}`,
        variant: "destructive",
        duration: 5000,
        action: (
          <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-4 w-4 text-red-600" />
          </div>
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateForFileName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime())
      ? format(date, "yyyy-MM-dd")
      : "tarihsiz";
  };

  const loadPdfMakeScripts = async () => {
    if (window.pdfMake) return;

    try {
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"
      );
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"
      );

      window.pdfMake.fonts = {
        Roboto: {
          normal:
            "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf",
          bold: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf",
          italics:
            "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf",
          bolditalics:
            "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf",
        },
      };
    } catch (error) {
      console.error("Script loading failed:", error);
      throw new Error("PDF kütüphaneleri yüklenemedi");
    }
  };

  const loadScript = (url: string) => {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  };

  const preparePdfData = (
    diet: Diet | undefined,
    pdfData: PDFData | undefined
  ): PDFData | null => {
    if (pdfData) {
      const processedData = {
        ...pdfData,
        ogunler: pdfData.ogunler.map((ogun) => {
          // Process menu items
          const processedMenuItems = ogun.menuItems
            .map((item) => {
              if (typeof item === "string") return item;

              const miktar = (item as { miktar?: string }).miktar || "";
              const birim = (item as { birim?: string }).birim || "";
              const besin = (item as { besin?: string }).besin || "";

              return [miktar, birim, besin].filter(Boolean).join(" ");
            })
            .filter(Boolean);

          // Keep original notes/detail
          return {
            name: ogun.name,
            time: ogun.time,
            menuItems: processedMenuItems,
            notes: ogun.notes || "", // Keep empty string if no notes
            detail: ogun.notes || "", // Keep empty string if no detail
          };
        }),
      };

      return processedData;
    }

    if (!diet) return null;

    // Handle diet data
    const oguns = diet.Oguns || [];
    const clientName = (diet.AdSoyad || "İsimsiz Danışan").trim();

    const preparedData = {
      fullName: clientName,
      dietDate: diet.Tarih || new Date().toISOString(),
      weeklyResult: diet.Sonuc || "Sonuç belirtilmemiş",
      target: diet.Hedef || "Hedef belirtilmemiş",
      ogunler: oguns.map((meal: any) => {
        console.log("Processing meal from diet:", meal);

        // Handle notes from diet data
        const notesText = meal.detail || meal.notes || "";

        return {
          name: meal.name || "Öğün Adı Belirtilmemiş",
          time: meal.time || "Saat Belirtilmemiş",
          menuItems: (meal.items || [])
            .map((item: any) => {
              const besinName =
                typeof item.besin === "object"
                  ? item.besin.name
                  : item.besin || "";
              const birimName =
                typeof item.birim === "object"
                  ? item.birim.name
                  : item.birim || "";
              const menuItemText = [item.miktar, birimName, besinName]
                .filter(Boolean)
                .join(" ");
              return menuItemText;
            })
            .filter(Boolean),
          notes: notesText,
          detail: notesText,
        };
      }),
      waterConsumption: diet.Su || "Belirtilmemiş",
      physicalActivity: diet.Fizik || "Belirtilmemiş",
      dietitianNote: diet.dietitianNote || "",
      isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
      importantDate: diet.importantDateName
        ? {
            message: diet.importantDateName,
          }
        : undefined,
    };

    console.log(
      "Prepared Data from diet:",
      JSON.stringify(preparedData, null, 2)
    );
    return preparedData;
  };

  const buildMealTableRows = (dietData: PDFData) => {
    const rows = [
      [
        { text: "ÖĞÜN", style: "tableHeader", alignment: "center" },
        { text: "SAAT", style: "tableHeader", alignment: "center" },
        { text: "MENÜ", style: "tableHeader", alignment: "center" },
        { text: "NOTLAR", style: "tableHeader", alignment: "center" },
      ],
    ];

    dietData.ogunler.forEach((ogun) => {
      const menuText = ogun.menuItems.join("\n• ");

      rows.push([
        {
          text: ogun.name,
          style: "tableCell",
          alignment: "center",
        },
        {
          text: ogun.time,
          style: "tableCell",
          alignment: "center",
        },
        {
          text: `• ${menuText}`,
          style: "tableCell",
          alignment: "left",
        },
        {
          text: ogun.notes || "-", // Show dash for empty notes
          style: "tableCell",
          alignment: "left",
        },
      ]);
    });

    return rows;
  };

  const createDocDefinition = (pdfData: PDFData, backgroundDataUrl: string) => {
    // Color scheme
    const primaryColor = "#2563eb"; // Professional blue
    const secondaryColor = "#64748b"; // Subtle slate gray
    const borderColor = "#e2e8f0"; // Light gray border
    const accentColor = "#3b82f6"; // Lighter blue for accents

    const formattedDietDate = formatDateTR(pdfData.dietDate);

    // Celebrations content - only create if they exist
    const celebrationsContent: {
      text: string;
      style: string;
      color: string;
      margin: number[];
    }[] = [];

    if (pdfData.isBirthdayCelebration) {
      celebrationsContent.push({
        text: "🎂 Doğum Gününüz Kutlu Olsun! İyi ki doğdunuz.",
        style: "celebration",
        color: "#8B5CF6",
        margin: [0, 10, 0, 0],
      });
    }

    if (pdfData.isImportantDateCelebrated && pdfData.importantDate?.message) {
      celebrationsContent.push({
        text: `🎉 ${pdfData.importantDate.message}`,
        style: "celebration",
        color: "#D97706",
        margin: [0, pdfData.isBirthdayCelebration ? 5 : 10, 0, 0],
      });
    }

    const content = [
      // Danışan Bilgileri section
      {
        text: "DANIŞAN BİLGİLERİ",
        style: "sectionHeader",
        margin: [0, 25, 0, 10],
      },
      {
        table: {
          widths: ["50%", "50%"],
          body: [
            [
              {
                text: `Ad Soyad: ${pdfData.fullName}`,
                style: "clientInfo",
                border: [false, false, false, false],
              },
              {
                text: `Hedef: ${pdfData.target}`,
                style: "clientInfo",
                border: [false, false, false, false],
              },
            ],
            [
              {
                text: `Tarih: ${formattedDietDate}`,
                style: "clientInfo",
                border: [false, false, false, false],
              },
              {
                text: `Sonuç: ${pdfData.weeklyResult}`,
                style: "clientInfo",
                border: [false, false, false, false],
              },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 15],
      },

      // Nutrition Program section
      {
        stack: [
          {
            text: "GÜNLÜK BESLENME PROGRAMI",
            style: "sectionHeader",
          },
          {
            canvas: [
              {
                type: "line",
                x1: 0,
                y1: 0,
                x2: 515, // Adjust width as needed
                y2: 0,
                lineWidth: 0.5,
                lineColor: borderColor,
              },
            ],
          },
        ],
        margin: [0, 10, 0, 15],
      },
      {
        table: {
          headerRows: 1,
          widths: ["15%", "15%", "42%", "28%"],
          body: buildMealTableRows(pdfData),
        },
        layout: {
          hLineWidth: (i, node) =>
            i === 0 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i) => (i === 0 ? primaryColor : borderColor),
          vLineColor: () => borderColor,
          fillColor: function (rowIndex) {
            if (rowIndex === 0) {
              return primaryColor;
            }
            return rowIndex % 2 === 1 ? "#f9fafb" : null;
          },
          paddingTop: (i) => (i === 0 ? 8 : 6),
          paddingBottom: (i) => (i === 0 ? 8 : 6),
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
        margin: [0, 0, 0, 20],
      },

      // Water and Physical Activity section
      {
        columns: [
          {
            width: "50%",
            stack: [
              {
                text: "SU TÜKETİMİ",
                style: "recommendationHeader",
                margin: [0, 0, 0, 5],
              },
              {
                text: pdfData.waterConsumption || "Belirtilmemiş",
                style: "recommendationContent",
              },
            ],
          },
          {
            width: "50%",
            stack: [
              {
                text: "FİZİKSEL AKTİVİTE",
                style: "recommendationHeader",
                margin: [0, 0, 0, 5],
              },
              {
                text: pdfData.physicalActivity || "Belirtilmemiş",
                style: "recommendationContent",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 15],
      },
    ];

    // Add Dietitian Note if exists

    console.log(pdfData.dietitianNote, "pdfData.dietitianNote");

    if (pdfData.dietitianNote) {
      content.push(
        {
          text: "DİYETİSYEN NOTU",
          style: "sectionHeader",
          margin: [0, 20, 0, 10],
        },
        {
          text: pdfData.dietitianNote,
          style: {
            fontSize: 11,
            color: secondaryColor,
            lineHeight: 1.4,
          },
          margin: [0, 0, 0, 20],
        }
      );
    }

    // Add Celebrations if exist
    if (celebrationsContent.length > 0) {
      content.push({
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: celebrationsContent,
                alignment: "center",
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => "#e9d5ff",
          vLineColor: () => "#e9d5ff",
          fillColor: () => "#f3e8ff",
          paddingTop: () => 10,
          paddingBottom: () => 10,
          paddingLeft: () => 10,
          paddingRight: () => 10,
        },
        margin: [0, 10, 0, 15],
      });
    }

    // Add signature to content
    content.push({
      columns: [
        {
          width: "*",
          stack: [],
        },
        {
          width: "auto",
          stack: [
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 150,
                  y2: 0,
                  lineWidth: 1,
                  lineColor: primaryColor,
                },
              ],
              margin: [0, 0, 0, 5],
            },
            {
              text: "Dyt. Ezgi Evgin Aktaş",
              style: "signatureText",
              alignment: "center",
            },
          ],
        },
      ],
      margin: [0, 20, 0, 0],
    });

    return {
      content,
      pageSize: "A4",
      pageMargins: [40, 40, 40, 60], // Reduced top margin
      styles: {
        sectionHeader: {
          fontSize: 16, // Increased from 14
          bold: true,
          color: primaryColor,
          alignment: "left",
          borderBottom: {
            width: 1,
            color: primaryColor,
          },
          margin: [0, 5, 0, 8],
        },
        labelBold: {
          fontSize: 13, // Increased from 11
          bold: true,
          color: "#374151",
        },
        valueText: {
          fontSize: 13, // Increased from 11
          color: "#1f2937",
        },
        tableHeader: {
          fontSize: 13, // Increased from 11
          bold: true,
          color: "#ffffff",
        },
        tableCell: {
          fontSize: 12, // Increased from 10
          color: "#374151",
        },
        tableCellItalic: {
          fontSize: 12, // Increased from 10
          italics: true,
          color: "#9ca3af",
        },
        recommendationHeader: {
          fontSize: 14, // Increased from 12
          bold: true,
          color: primaryColor,
        },
        recommendationContent: {
          fontSize: 13, // Increased from 11
          color: "#374151",
        },
        celebration: {
          fontSize: 15, // Increased from 13
          bold: true,
          alignment: "center",
        },
        signatureText: {
          fontSize: 14, // Increased from 12
          bold: true,
          color: primaryColor,
        },
        footerText: {
          fontSize: 10, // Increased from 9
          color: secondaryColor,
          alignment: "center",
        },
        clientInfo: {
          fontSize: 13, // Increased from 11
          color: "#374151",
          margin: [0, 2, 0, 2],
        },
      },
      header: {
        columns: [
          {
            image: backgroundDataUrl,
            width: 90,
            margin: [40, 20, 0, 0],
          },
        ],
      },
      footer: function (currentPage, pageCount) {
        return {
          columns: [
            {
              text:
                "Eryaman 4.Etap Üç Şehitler Cad. Haznedatoğlu Bl. 173 Etimesgut/ANKARA\n" +
                "Tel: 0546 265 04 40 • E-posta: ezgievgin_dytsyn@hotmail.com",
              style: "footerText",
              alignment: "center",
              margin: [40, 0, 40, 0],
            },
          ],
          margin: [0, 20, 0, 0],
        };
      },
      defaultStyle: {
        font: "Roboto",
        lineHeight: 1.3,
      },
    };
  };

  const shareViaWhatsApp = async (pdfDataToShare: PDFData) => {
    try {
      setIsLoading(true);

      // Check if diet has an ID
      if (!pdfDataToShare.id) {
        toast({
          title: "Uyarı",
          description: "Lütfen önce diyeti kaydedin.",
          variant: "warning",
          duration: 5000,
        });
        return;
      }

      // Use the provided phone number or a test one
      const phoneToUse = phoneNumber || "5333104970"; // Replace with your test number

      // Format phone number (remove spaces, +, etc.)
      let formattedPhone = phoneToUse.replace(/\D/g, "");

      // If it doesn't start with country code, add Turkish code
      if (!formattedPhone.startsWith("90")) {
        formattedPhone = `90${formattedPhone}`;
      }

      // Create a message with the download link
      const message = encodeURIComponent(
        `Merhaba ${pdfDataToShare.fullName || "Danışanım"},\n\n` +
          `${
            pdfDataToShare.dietDate
              ? formatDateTR(pdfDataToShare.dietDate)
              : "Bugün"
          } tarihli beslenme programınızı hazırladım.\n\n` +
          `Sağlıklı günler dilerim,\n` +
          `Dyt. Ezgi Evgin Aktaş`
      );

      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

      // Open WhatsApp in a new window
      window.open(whatsappUrl, "_blank");

      toast({
        title: "WhatsApp Açıldı",
        description: "WhatsApp mesajınız hazırlandı, göndermeye hazır.",
        variant: "default",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error);
      toast({
        title: "Hata",
        description: `WhatsApp üzerinden paylaşım yapılırken bir hata oluştu: ${
          (error as Error).message
        }`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = async () => {
    if (!dietId || !phoneNumber) {
      onError?.("DietId ve telefon numarası gereklidir");
      return;
    }

    try {
      setIsLoading(true);

      // Format phone number (remove spaces, +, etc.)
      let formattedPhone = phoneNumber.replace(/\D/g, "");

      // If it doesn't start with country code, add Turkish code
      if (!formattedPhone.startsWith("90")) {
        formattedPhone = `90${formattedPhone}`;
      }

      // Create the download URL using the diet ID
      const baseUrl = window.location.origin;
      const downloadUrl = `${baseUrl}/api/diets/download/${dietId}`;

      // Create a message with the download link
      const message = encodeURIComponent(
        `Merhaba ${pdfData!.fullName || "Danışanım"},\n\n` +
          `${
            pdfData!.dietDate
              ? format(new Date(pdfData!.dietDate), "dd.MM.yyyy")
              : "Bugün"
          } ` +
          `tarihli beslenme programınızı hazırladım.\n\n` +
          `Sağlıklı günler dilerim,\n` +
          `Dyt. Ezgi Evgin Aktaş`
      );

      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

      // Open WhatsApp in a new window
      window.open(whatsappUrl, "_blank");

      toast({
        title: "WhatsApp Açıldı",
        description: "WhatsApp mesajınız hazırlandı, göndermeye hazır.",
        variant: "default",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error);
      onError?.(
        error instanceof Error
          ? error.message
          : "WhatsApp açılırken bir hata oluştu"
      );

      toast({
        title: "Hata",
        description: `WhatsApp üzerinden paylaşım yapılırken bir hata oluştu: ${
          error instanceof Error ? error.message : "Beklenmeyen bir hata"
        }`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className={`gap-2 ${className}`}
        onClick={generatePDF}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        PDF İndir
      </Button>

      {/* <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => {
          const pdfDataToShare = preparePdfData(diet, pdfData);
          if (pdfDataToShare) {
            // Check if diet is saved (has an ID)
            if (!diet || !diet.id) {
              toast({
                title: "Uyarı",
                description: "Lütfen önce diyeti kaydedin.",
                variant: "warning",
                duration: 5000,
              });
              return;
            }
            shareViaWhatsApp(pdfDataToShare);
          }
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share className="h-4 w-4" />
        )}
        WhatsApp
      </Button> */}

      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        className={className}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4 mr-2" />
        )}
        WhatsApp
      </Button>
    </div>
  );
};

export default DirectPDFButton;

// import { Button } from "./ui/button";
// import { format } from "date-fns";
// import { tr } from "date-fns/locale/tr";
// import { useToast } from "./ui/use-toast";
// import { FileText, Loader2, MessageCircle } from "lucide-react";
// import { generatePDF } from "@/utils/pdfGenerator";

// const formatDateTR = (dateString: string | null | undefined | Date) => {
//   if (!dateString) return "Tarih Belirtilmemiş";
//   try {
//     const date =
//       typeof dateString === "string"
//         ? new Date(dateString)
//         : dateString instanceof Date
//         ? dateString
//         : new Date();
//     return format(date, "d MMMM yyyy", { locale: tr });
//   } catch (error) {
//     console.error("Date parsing error:", error);
//     return "Geçersiz Tarih";
//   }
// };

// interface PDFData {
//   id?: number;
//   fullName: string;
//   dietDate: string;
//   weeklyResult: string;
//   target: string;
//   ogunler: any[];
//   waterConsumption: string;
//   physicalActivity: string;
//   dietitianNote?: string;
// }

// interface DirectPDFButtonProps {
//   pdfData: PDFData;
//   variant?: string;
//   className?: string;
//   phoneNumber?: string;
// }

// const DirectPDFButton = ({
//   pdfData,
//   variant = "default",
//   className,
//   phoneNumber,
// }: DirectPDFButtonProps) => {
//   const { toast } = useToast();

//   const handleWhatsAppShare = async () => {
//     try {
//       const apiUrl = `/api/diets/${pdfData.id}/whatsapp`;

//       const response = await fetch(apiUrl, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           phoneNumber: phoneNumber.replace(/\D/g, ""), // Remove non-numeric characters
//         }),
//       });

//       const responseData = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           responseData.message || "WhatsApp gönderimi başarısız oldu"
//         );
//       }

//       // Open WhatsApp URL in a new window
//       if (responseData.whatsappUrl) {
//         window.open(responseData.whatsappUrl, "_blank");
//       }

//       toast({
//         title: "Başarılı",
//         description: "WhatsApp sayfası açıldı",
//         variant: "default",
//       });
//     } catch (error) {
//       console.error("Error details:", {
//         message: error.message,
//         stack: error.stack,
//       });

//       toast({
//         title: "Hata",
//         description: `WhatsApp raporu gönderilirken bir hata oluştu: ${error.message}`,
//         variant: "destructive",
//       });
//     }
//   };

//   return (
//     <>
//       <Button
//         type="button"
//         onClick={generatePDF}
//         disabled={isLoading}
//         className={`
//         no-print
//         bg-gradient-to-r from-blue-600 to-teal-600
//         hover:from-blue-700 hover:to-teal-700
//         text-white
//         rounded-md
//         transition-all
//         duration-200
//         shadow-md
//         hover:shadow-lg
//         flex
//         items-center
//         justify-center
//         px-6
//         py-2.5
//         min-w-[200px]
//         ${className}
//       `}
//         {...props}
//       >
//         {isLoading ? (
//           <>
//             <Loader2 className="w-5 h-5 mr-3 animate-spin" />
//             <span className="font-medium">PDF Hazırlanıyor...</span>
//           </>
//         ) : (
//           <>
//             <FileText className="w-5 h-5 mr-3" />
//             <span className="font-medium">PDF Oluştur</span>
//           </>
//         )}
//       </Button>
//       );
//       <Button
//         type="button"
//         variant={variant}
//         onClick={handleWhatsAppShare}
//         className={className}
//         disabled={!pdfData.id || !phoneNumber}
//       >
//         <MessageCircle className="h-4 w-4 mr-2" />
//         WhatsApp Raporu
//           </Button>
//         </>
//       );
//     };

//     export default DirectPDFButton;
