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
    const rows = [
      [
        { text: "ÖĞÜN", style: "tableHeader", alignment: "left" },
        { text: "SAAT", style: "tableHeader", alignment: "left" },
        { text: "MENÜ", style: "tableHeader", alignment: "left" },
        { text: "NOTLAR", style: "tableHeader", alignment: "left" },
      ],
    ];

    dietData.ogunler.forEach((ogun) => {
      const menuText = ogun.menuItems.join("\n• ") || "Belirtilmemiş";
      rows.push([
        {
          text: ogun.name || "Belirtilmemiş",
          style: "tableCell",
          alignment: "left",
        },
        {
          text: ogun.time || "Belirtilmemiş",
          style: "tableCell",
          alignment: "left",
        },
        { text: `• ${menuText}`, style: "tableCell", alignment: "left" },
        {
          text: ogun.notes || "-",
          style: ogun.notes ? "tableCell" : "tableCellItalic",
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

    // Define the content type
    type ContentItem = {
      text?: string;
      style?: string;
      color?: string;
      margin?: number[];
      columns?: any[];
      stack?: any[];
      table?: any;
      layout?: any;
      alignment?: string;
    };

    const content: ContentItem[] = [
      {
        columns: [
          {
            image: backgroundDataUrl,
            width: 90,
            margin: [0, 0, 0, 10],
          },
        ],
        alignment: "center",
      },
      {
        stack: [
          {
            text: "DANIŞAN BİLGİLERİ",
            style: "sectionHeader",
            margin: [0, 10, 0, 10],
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
        ],
        margin: [0, 0, 0, 20],
      },
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
                x2: 515,
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
    ];

    // Add celebrations if they exist
    if (celebrationsContent.length > 0) {
      content.push(...celebrationsContent);
    }

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

    content.push(
      {
        text: "GÜNLÜK TAKİP ÖNERİLERİ",
        style: "sectionHeader",
        margin: [0, 10, 0, 10],
      },
      {
        columns: [
          {
            width: "50%",
            stack: [
              {
                text: "Su Tüketimi",
                style: "recommendationHeader",
                margin: [0, 0, 0, 5],
              },
              {
                text: pdfData.waterConsumption,
                style: "recommendationContent",
                margin: [0, 0, 0, 15],
              },
            ],
          },
          {
            width: "50%",
            stack: [
              {
                text: "Fiziksel Aktivite",
                style: "recommendationHeader",
                margin: [0, 0, 0, 5],
              },
              {
                text: pdfData.physicalActivity,
                style: "recommendationContent",
                margin: [0, 0, 0, 15],
              },
            ],
          },
        ],
      },
      {
        stack: [
          {
            canvas: [
              {
                type: "line",
                x1: 0,
                y1: 0,
                x2: 200,
                y2: 0,
                lineWidth: 1,
                lineColor: primaryColor,
              },
            ],
            margin: [0, 30, 0, 5],
          },
          { text: "Dyt. Ezgi Evgin Aktaş", style: "signatureText" },
        ],
        alignment: "right",
        margin: [0, 20, 40, 0],
      }
    );

    return {
      content,
      pageSize: "A4",
      pageMargins: [40, 40, 40, 60], // Reduced top margin from 100 to 40
      // header: {
      //   columns: [
      //     {
      //       image: backgroundDataUrl,
      //       width: 90,
      //       margin: [40, 20, 0, 0],
      //     },
      //   ],
      // },
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
          fontSize: 11,
          bold: true,
          color: "#374151",
        },
        valueText: {
          fontSize: 11,
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
          fontSize: 12,
          bold: true,
          color: primaryColor,
        },
        recommendationContent: {
          fontSize: 11,
          color: "#374151",
        },
        celebration: {
          fontSize: 15, // Increased from 13
          bold: true,
          alignment: "center",
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
        clientInfo: {
          fontSize: 13, // Increased from 11
          color: "#374151",
          margin: [0, 2, 0, 2],
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
