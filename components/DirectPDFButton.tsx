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
  importantDateId?: number | null;
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
  importantDateId,
  disabled,
  onError,
  variant = "outline",
  size = "sm",
  onClick,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string>("");
  const [importantDateMessage, setImportantDateMessage] = useState<string>("");

  useEffect(() => {
    const loadImages = async () => {
      try {
        const logoResponse = await fetch("/ezgi_evgin.png");
        if (!logoResponse.ok)
          throw new Error(`HTTP error! status: ${logoResponse.status}`);
        const logoBlob = await logoResponse.blob();
        const logoReader = new FileReader();
        logoReader.onloadend = () => {
          setBackgroundDataUrl(logoReader.result as string);
          console.log("Logo loaded successfully");
        };
        logoReader.readAsDataURL(logoBlob);
      } catch (error) {
        console.error("Error loading images:", error);
      }
    };
    loadImages();
  }, []);

  useEffect(() => {
    const fetchImportantDate = async () => {
      console.log("Starting fetchImportantDate with:", {
        importantDateId,
        isImportantDateCelebrated: pdfData?.isImportantDateCelebrated,
      });
      if (!importantDateId || !pdfData?.isImportantDateCelebrated) {
        console.log("Skipping fetch - missing required data");
        return;
      }
      try {
        const response = await fetch(
          `/api/important-dates/${importantDateId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched important date data:", data);
        if (data.message) {
          setImportantDateMessage(data.message);
        }
      } catch (error) {
        console.error("Error fetching important date:", error);
      }
    };
    // Immediately invoke the fetch when conditions are met
    if (importantDateId && pdfData?.isImportantDateCelebrated) {
      fetchImportantDate();
    }
  }, [importantDateId, pdfData?.isImportantDateCelebrated]); // Dependencies

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

  interface MenuItem {
    miktar?: string;
    birim?: { name: string } | string;
    besin?: { name: string } | string;
  }

  const formatMenuItem = (item: MenuItem | string): string => {
    if (typeof item === "string") return item;
    const miktar = item.miktar ?? "";
    const birim =
      typeof item.birim === "string" ? item.birim : item.birim?.name ?? "";
    const besin =
      typeof item.besin === "string" ? item.besin : item.besin?.name ?? "";
    return `${miktar} ${birim} ${besin}`.trim();
  };

  const preparePdfData = (
    diet: Diet | undefined,
    pdfData: PDFData | undefined
  ): PDFData | null => {
    console.log("Starting preparePdfData with message:", importantDateMessage);
    if (pdfData) {
      // For pdfData case, ensure menu items are properly formatted
      const processedData: PDFData = {
        ...pdfData,
        ogunler: pdfData.ogunler.map((ogun) => ({
          ...ogun,
          menuItems: ogun.menuItems
            .map((item) => formatMenuItem(item))
            .filter(Boolean),
        })),
        isBirthdayCelebration: pdfData.isBirthdayCelebration || false,
        isImportantDateCelebrated: pdfData.isImportantDateCelebrated || false,
        importantDate: pdfData.isImportantDateCelebrated
          ? { message: importantDateMessage }
          : undefined,
      };
      return processedData;
    }
    if (!diet) return null;
    // Handle diet data case
    const oguns = diet.Oguns || [];
    const clientName = (diet.AdSoyad || "İsimsiz Danışan").trim();
    return {
      fullName: clientName,
      dietDate: diet.Tarih || new Date().toISOString(),
      weeklyResult: diet.Sonuc || "Sonuç belirtilmemiş",
      target: diet.Hedef || "Hedef belirtilmemiş",
      ogunler: oguns.map((meal: any) => ({
        name: meal.name,
        time: meal.time,
        menuItems: meal.items
          .map((item: any) => formatMenuItem(item))
          .filter(Boolean),
        notes: meal.detail || meal.notes || "",
      })),
      waterConsumption: diet.Su || "Belirtilmemiş",
      physicalActivity: diet.Fizik || "Belirtilmemiş",
      dietitianNote: diet.dietitianNote || "",
      isBirthdayCelebration: diet.isBirthdayCelebration || false,
      isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
      importantDate: diet.isImportantDateCelebrated
        ? { message: importantDateMessage }
        : undefined,
    };
  };

  interface TableCell {
    text: string;
    style: string;
    alignment: string;
    colSpan?: number;
  }

  const buildMealTableRows = (dietData: PDFData) => {
    const rows: TableCell[][] = [
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
          text: ogun.notes || "-",
          style: "tableCell",
          alignment: "left",
        },
      ]);
    });
    // Append water consumption row only if it has a value
    if (dietData.waterConsumption?.trim()) {
      rows.push([
        {
          text: "SU TÜKETİMİ",
          style: "tableCell",
          alignment: "left",
          colSpan: 2,
        },
        {
          text: "",
          style: "tableCell",
          alignment: "left",
        },
        {
          text: dietData.waterConsumption,
          style: "tableCell",
          alignment: "left",
          colSpan: 2,
        },
        {
          text: "",
          style: "tableCell",
          alignment: "left",
        },
      ]);
    }
    // Append physical activity row only if it has a value
    if (dietData.physicalActivity?.trim()) {
      rows.push([
        {
          text: "FİZİKSEL AKTİVİTE",
          style: "tableCell",
          alignment: "left",
          colSpan: 2,
        },
        {
          text: "",
          style: "tableCell",
          alignment: "left",
        },
        {
          text: dietData.physicalActivity,
          style: "tableCell",
          alignment: "left",
          colSpan: 2,
        },
        {
          text: "",
          style: "tableCell",
          alignment: "left",
        },
      ]);
    }
    return rows;
  };

  const createDocDefinition = (pdfData: PDFData, backgroundDataUrl: string) => {
    console.log("Creating doc definition with data:", {
      isBirthdayCelebration: pdfData.isBirthdayCelebration,
      isImportantDateCelebrated: pdfData.isImportantDateCelebrated,
      importantDate: pdfData.importantDate,
    });
    // Color scheme - changed to pink color
    const primaryColor = "#d32d7e"; // Changed to pink color
    const secondaryColor = "#64748b"; // Subtle slate gray
    const borderColor = "#e2e8f0"; // Light gray border
    const formattedDietDate = formatDateTR(pdfData.dietDate);

    // Celebrations content - only create if they exist
    const celebrationsContent: {
      text: string;
      style: string;
      color: string;
      margin: number[];
    }[] = [];
    if (pdfData.isBirthdayCelebration) {
      console.log("Adding birthday celebration");
      celebrationsContent.push({
        text: "🎂 Doğum Gününüz Kutlu Olsun! İyi ki doğdunuz.",
        style: "celebration",
        color: "#d32d7e",
        margin: [0, 5, 0, 0], // Reduced margin
      });
    }
    if (pdfData.isImportantDateCelebrated && pdfData.importantDate?.message) {
      console.log(
        "Adding important date celebration with message:",
        pdfData.importantDate.message
      );
      celebrationsContent.push({
        text: `🎉 ${pdfData.importantDate.message}`,
        style: "celebration",
        color: "#D97706",
        margin: [0, pdfData.isBirthdayCelebration ? 3 : 5, 0, 0], // Reduced margin
      });
    }
    console.log("Final celebrations content:", celebrationsContent);

    type PDFContentItem = {
      text?: string;
      style?: string;
      margin?: number[];
      columns?: any[];
      stack?: any[];
      table?: {
        widths?: (string | number)[];
        headerRows?: number;
        body?: any[][];
      };
      layout?: any;
      image?: string;
      width?: number;
      opacity?: number;
      alignment?: string;
      absolutePosition?: { x: number; y: number };
    };

    const content: PDFContentItem[] = [
      // Title at the very top - moved down by 10px
      {
        text: "KİŞİYE ÖZEL BESLENME PLANI",
        alignment: "center",
        style: "titleStyle",
        margin: [0, 20, 0, 12], // Increased top margin to 20px
      },
      // Client info - redesigned to be centered with bold text
      {
        text: `${pdfData.fullName} / ${formattedDietDate}`,
        style: "clientInfoCentered",
        alignment: "center",
        margin: [0, 0, 0, 15],
      },
      // Nutrition Program section
      {
        image: backgroundDataUrl,
        width: 300,
        opacity: 0.1,
        alignment: "center",
        margin: [0, 20, 0, -25],
        absolutePosition: { x: 50, y: 300 }, // Changed x from 150 to 50
      },
      {
        table: {
          headerRows: 1,
          widths: ["12%", "8%", "38%", "42%"],
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
              return "#d32d7e"; // Header background color (pink)
            }
            return rowIndex % 2 === 1 ? "#fce7f3" : null; // Light pink for alternating rows
          },
          paddingTop: (i) => (i === 0 ? 6 : 4), // Reduced padding
          paddingBottom: (i) => (i === 0 ? 6 : 4), // Reduced padding
          paddingLeft: () => 6, // Reduced padding
          paddingRight: () => 6, // Reduced padding
        },
        margin: [0, 0, 0, 10], // Reduced margin
      },
      // Water and Physical Activity section
      {
        columns: [
          {
            width: "50%",
            stack: [
              {
                text: "",
                style: "recommendationHeader",
                margin: [0, 0, 0, 3], // Reduced margin
              },
              {
                text: "",
                style: "recommendationContent",
              },
            ],
          },
          {
            width: "50%",
            stack: [
              {
                text: "",
                style: "recommendationHeader",
                margin: [0, 0, 0, 3], // Reduced margin
              },
              {
                text: "",
                style: "recommendationContent",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8], // Reduced margin
      },
    ];

    // Add Dietitian Note if exists - more compact
    if (pdfData.dietitianNote) {
      content.push(
        {
          text: "DİYETİSYEN NOTU",
          style: "sectionHeader",
          margin: [0, 20, 0, 15], // Reduced margins
        },
        {
          text: pdfData.dietitianNote,
          style: "dietitianNote",
          margin: [0, 0, 0, 10], // Reduced margin
        }
      );
    }

    // Add Celebrations if exist - more compact
    if (celebrationsContent.length > 0) {
      content.push({
        table: {
          widths: ["*"],
          body: [
            [
              {
                text: celebrationsContent.map((c) => c.text).join("\n"),
                alignment: "center",
                style: "celebration",
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => borderColor,
          vLineColor: () => "#fbcfe8",
          fillColor: () => "#d32d7e",
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
        margin: [0, 8, 0, 8],
      } as PDFContentItem);
    }

    // Add signature to content - more compact
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
              text: "Dyt. Ezgi Evgin Aktaş",
              style: "signatureText",
              margin: [0, 10, 0, 0], // Reduced margin
            },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    });

    return {
      content,
      pageSize: "A4",
      pageMargins: [30, 30, 30, 50], // Reduced margins
      styles: {
        sectionHeader: {
          fontSize: 14, // Reduced from 16
          bold: true,
          color: primaryColor,
          alignment: "left",
          borderBottom: {
            width: 1,
            color: primaryColor,
          },
          margin: [0, 3, 0, 5], // Reduced margins
        },
        labelBold: {
          fontSize: 12, // Reduced from 13
          bold: true,
          color: "#374151",
        },
        valueText: {
          fontSize: 12, // Reduced from 13
          color: "#1f2937",
        },
        tableHeader: {
          fontSize: 12, // Reduced from 13
          bold: true,
          color: "#ffffff",
        },
        tableCell: {
          fontSize: 11, // Reduced from 12
          color: "#374151",
        },
        tableCellItalic: {
          fontSize: 11, // Reduced from 12
          italics: true,
          color: "#9ca3af",
        },
        recommendationHeader: {
          fontSize: 13, // Reduced from 14
          bold: true,
          color: primaryColor,
        },
        recommendationContent: {
          fontSize: 12, // Reduced from 13
          color: "#374151",
        },
        celebration: {
          fontSize: 14, // Reduced from 15
          bold: true,
          alignment: "center",
        },
        signatureText: {
          fontSize: 13, // Reduced from 14
          bold: true,
          color: primaryColor,
          alignment: "right",
          decoration: "underline",
          decorationStyle: "solid",
          decorationColor: primaryColor,
        },
        footerText: {
          fontSize: 9, // Reduced from 10
          color: secondaryColor,
          alignment: "center",
        },
        clientInfoCentered: {
          fontSize: 16, // Larger font size
          color: "#374151",
          bold: true,
          lineHeight: 1.2,
        },
        dietitianNote: {
          fontSize: 10, // Reduced from 11
          color: secondaryColor,
          lineHeight: 1.3, // Reduced line height
        },
        titleStyle: {
          fontSize: 20,
          bold: true,
          color: "#d32d7e", // Changed to pink
        },
      },
      header: {
        columns: [
          {
            image: backgroundDataUrl,
            width: 132, // Increased from 120 to 180 (1.5x larger)
            margin: [30, 15, 0, 0],
          },
          {
            text: "", // Removed the header text since it's now in the content
            alignment: "center",
            fontSize: 16,
            bold: true,
            margin: [0, 25, 0, -25],
            color: "#d32d7e",
          },
        ],
      },
      footer: function () {
        return {
          columns: [
            {
              text:
                "Eryaman 4.Etap Üç Şehitler Cad. Haznedatoğlu Bl. 173 Etimesgut/ANKARA\n" +
                "Tel: 0546 265 04 40 • E-posta: ezgievgin_dytsyn@hotmail.com",
              style: "footerText",
              alignment: "center",
              margin: [30, 0, 30, 0], // Reduced margins
            },
          ],
          margin: [0, 10, 0, 0], // Reduced margin
        };
      },
      defaultStyle: {
        font: "Roboto",
        lineHeight: 1.2, // Reduced line height
      },
    };
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

// Add TypeScript interface for the window object to include pdfMake
declare global {
  interface Window {
    pdfMake: any;
  }
}
