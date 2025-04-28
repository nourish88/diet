import { useEffect, useState } from "react";

// Extend the Window interface to include pdfMake
declare global {
  interface Window {
    pdfMake: any;
  }
}
import { Button, ButtonProps } from "./ui/button";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
interface TableCell {
  text: string;
  style: string;
  alignment: string;
  colSpan?: number;
}
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
interface PDFData {
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
  dietitianNote?: string;
}

interface DatabasePDFButtonProps extends ButtonProps {
  diet: any;
}

const DatabasePDFButton = ({
  diet,
  className,
  ...props
}: DatabasePDFButtonProps) => {
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

  const formatDateTR = (dateString: string | null | undefined) => {
    if (!dateString) return "Tarih Belirtilmemiş";
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy", { locale: tr });
    } catch (error) {
      console.error("Date parsing error:", error);
      return "Geçersiz Tarih";
    }
  };

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      if (typeof window === "undefined") {
        throw new Error(
          "PDF oluşturma işlemi yalnızca tarayıcı ortamında gerçekleştirilebilir"
        );
      }

      await loadPdfMakeScripts();
      if (!window.pdfMake) throw new Error("PDF oluşturma modülü yüklenemedi");
      if (!backgroundDataUrl) throw new Error("Logo yüklenemedi");

      const pdfData = preparePdfDataFromDatabase(diet);
      if (!pdfData) throw new Error("Beslenme programı verisi bulunamadı");

      console.log("PDF data prepared:", pdfData);

      const docDefinition = createDocDefinition(pdfData, backgroundDataUrl);
      const fileName = `Beslenme_Programi_${pdfData.fullName.replace(
        /\s+/g,
        "_"
      )}_${formatDateForFileName(pdfData.dietDate)}.pdf`;
      window.pdfMake.createPdf(docDefinition).download(fileName);
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      alert(`PDF oluşturulamadı: ${(error as Error).message}`);
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

  const preparePdfDataFromDatabase = (diet: any): PDFData | null => {
    if (!diet) return null;

    console.log("Preparing PDF data from database diet:", diet);

    // Extract client name
    let clientName = "İsimsiz Danışan";
    if (diet.client) {
      clientName =
        diet.client.fullName ||
        `${diet.client.name || ""} ${diet.client.surname || ""}`.trim();
    }

    // Process meals (oguns)
    const processedMeals = (diet.oguns || []).map((ogun: any) => {
      // Process menu items
      const menuItems = (ogun.items || []).map((item: any) => {
        const besinName =
          typeof item.besin === "string" ? item.besin : item.besin?.name;
        const birimName =
          typeof item.birim === "string" ? item.birim : item.birim?.name;
        return `${besinName || ""} ${item.miktar || ""} ${
          birimName || ""
        }`.trim();
      });

      return {
        name: ogun.name || "Belirtilmemiş",
        time: ogun.time || "",
        menuItems: menuItems.length > 0 ? menuItems : ["Belirtilmemiş"],
        notes: ogun.detail || "",
        order: ogun.order || 0,
      };
    });

    // Sort meals by order if available
    const sortedMeals = processedMeals.sort(
      (a: any, b: any) => (a.order || 0) - (b.order || 0)
    );

    const pdfData = {
      fullName: clientName,
      dietDate: diet.tarih || diet.createdAt || new Date().toISOString(),
      weeklyResult: diet.sonuc || "Sonuç belirtilmemiş",
      target: diet.hedef || "Hedef belirtilmemiş",
      ogunler: sortedMeals,
      waterConsumption: diet.su || "Belirtilmemiş",
      physicalActivity: diet.fizik || "Belirtilmemiş",
      isBirthdayCelebration: diet.isBirthdayCelebration || false,
      dietitianNote: diet.dietitianNote || "",
    };

    console.log("Prepared PDF data:", pdfData);
    return pdfData;
  };

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
    // Color scheme - Updated to use #d32d7e
    const primaryColor = "#d32d7e"; // Changed from "#8B5CF6" to "#d32d7e"
    const secondaryColor = "#64748b"; // Subtle slate gray
    const borderColor = "#e2e8f0"; // Light gray border
    const stripedRowColor = "#fce7f3"; // Light pink background for striped rows

    const formattedDietDate = formatDateTR(pdfData.dietDate);

    const content: PDFContentItem[] = [
      // Background logo in center
      {
        image: backgroundDataUrl,
        width: 300,
        opacity: 0.1,
        alignment: "center",
        margin: [0, 20, 0, -25],
        absolutePosition: { x: 50, y: 300 },
      },
      // Title at the very top
      {
        text: "KİŞİYE ÖZEL BESLENME PLANI",
        alignment: "center",
        style: "titleStyle",
        margin: [0, 0, 0, 8],
      },
      // Reformatted client info - name and date on one line, bold and centered
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                text: `${pdfData.fullName} / ${formattedDietDate}`,
                style: "clientInfoBold",
                alignment: "center",
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 10],
      },
      // Main meals table
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
              return primaryColor;
            }
            return rowIndex % 2 === 1 ? stripedRowColor : null;
          },
          paddingTop: (i) => (i === 0 ? 6 : 4),
          paddingBottom: (i) => (i === 0 ? 6 : 4),
          paddingLeft: () => 6,
          paddingRight: () => 6,
        },
        margin: [0, 0, 0, 10],
      },
    ];

    // Add celebrations if they exist
    if (pdfData.isBirthdayCelebration) {
      content.push({
        table: {
          widths: ["*"],
          body: [
            [
              {
                text: "🎂 Doğum Gününüz Kutlu Olsun! İyi ki doğdunuz.",
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
          vLineColor: () => "#fbcfe8", // Updated to match new color scheme
          fillColor: () => stripedRowColor,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
        margin: [0, 8, 0, 8],
      });
    }

    // Add dietitian note if exists
    if (pdfData.dietitianNote) {
      content.push(
        {
          text: "DİYETİSYEN NOTU",
          style: "sectionHeader",
          margin: [0, 20, 0, 15],
        },
        {
          text: pdfData.dietitianNote,
          style: "dietitianNote",
          margin: [0, 0, 0, 10],
        }
      );
    }

    // Add signature
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
              margin: [0, 10, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    });

    return {
      content,
      pageSize: "A4",
      pageMargins: [30, 30, 30, 50],
      header: {
        columns: [
          {
            image: backgroundDataUrl,
            width: 132, // Increased from 120 to 180 (1.5x)
            margin: [30, 10, 0, 0],
          },
          {
            text: "KİŞİYE ÖZEL BESLENME PLANI",
            alignment: "center",
            fontSize: 16,
            bold: true,
            margin: [0, 45, 0, -25], // Moved down by 10px (from 35 to 45)
            color: primaryColor,
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
              margin: [40, 0, 40, 0],
            },
          ],
          margin: [0, 20, 0, 0],
        };
      },
      styles: {
        titleStyle: {
          fontSize: 20,
          bold: true,
          color: primaryColor,
        },
        clientInfo: {
          fontSize: 11,
          color: "#374151",
        },
        // New style for bold client info
        clientInfoBold: {
          fontSize: 14, // Increased font size
          bold: true,
          color: "#374151",
        },
        tableHeader: {
          fontSize: 12,
          bold: true,
          color: "#ffffff",
        },
        tableCell: {
          fontSize: 11,
          color: "#374151",
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: primaryColor,
        },
        celebration: {
          fontSize: 12,
          color: primaryColor,
        },
        signatureText: {
          fontSize: 12,
          bold: true,
          color: primaryColor,
        },
        footerText: {
          fontSize: 9,
          color: secondaryColor,
          alignment: "center",
        },
        dietitianNote: {
          fontSize: 11,
          color: secondaryColor,
          lineHeight: 1.4,
        },
      },
      defaultStyle: {
        font: "Roboto",
        lineHeight: 1.3,
      },
    };
  };

  return (
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
  );
};

export default DatabasePDFButton;
