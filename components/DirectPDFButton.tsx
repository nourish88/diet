import { useState } from "react";
import { Button, ButtonProps } from "./ui/button";
import { Diet } from "@/types/types";
import { FileText, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale/tr";

// Helper function to format dates in Turkish format
const formatDateTR = (dateString: string | null | undefined | Date) => {
  if (!dateString) return "Tarih Belirtilmemiş";
  
  try {
    // Try to parse the date string based on its type
    const date = typeof dateString === 'string' 
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

export interface PDFData {
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
}

interface DirectPDFButtonProps extends ButtonProps {
  diet?: Diet;
  pdfData?: PDFData;
}

const DirectPDFButton = ({ diet, pdfData, className, ...props }: DirectPDFButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      
      // Check if we're running in a browser environment
      if (typeof window === 'undefined') {
        throw new Error("PDFs can only be generated in a browser environment");
      }
      
      console.log("Starting PDF generation process");
      
      // Load pdfmake and fonts from CDN
      await loadPdfMakeScripts();

      if (!window.pdfMake) {
        throw new Error("pdfMake is not available after loading scripts");
      }

      console.log("pdfMake loaded successfully");

      // Use provided pdfData or create it from diet object
      const pdfDataToUse = pdfData || (diet ? {
        fullName: pdfData?.fullName || "İsimsiz Danışan",
        dietDate: diet.Tarih ? formatDateTR(diet.Tarih) : "Tarih Belirtilmemiş",
        weeklyResult: diet.Sonuc || "",
        target: diet.Hedef || "",
        ogunler: diet.Oguns.map((ogun) => ({
          name: ogun.name || "",
          time: ogun.time || "",
          menuItems: ogun.items
            .filter((item) => item.besin && item.besin.trim() !== "")
            .map((item) =>
              `${item.miktar || ""} ${item.birim || ""} ${
                item.besin || ""
              }`.trim()
            ),
          notes: ogun.detail || "",
        })),
        waterConsumption: diet.Su || "",
        physicalActivity: diet.Fizik || "",
      } : null);

      if (!pdfDataToUse) {
        throw new Error("No diet data provided");
      }

      console.log("PDF data prepared:", JSON.stringify(pdfDataToUse).substring(0, 200) + "...");
      
      // Add this logging to debug the fullName issue
      console.log("Client fullName:", pdfDataToUse.fullName);
      const fullNameToUse = pdfDataToUse.fullName && pdfDataToUse.fullName.trim() !== "" && pdfDataToUse.fullName !== "undefined undefined"
        ? pdfDataToUse.fullName
        : "İsimsiz Danışan";
      console.log("Using fullName:", fullNameToUse);

      // Process the dietDate to ensure it's formatted correctly if it's not already
      const formattedDietDate = pdfDataToUse.dietDate ? 
        (pdfDataToUse.dietDate.includes("Mart") || pdfDataToUse.dietDate.includes("Ocak") || 
         pdfDataToUse.dietDate.includes("Şubat") || pdfDataToUse.dietDate === "Tarih Belirtilmemiş") ? 
          pdfDataToUse.dietDate : formatDateTR(pdfDataToUse.dietDate) : "Tarih Belirtilmemiş";

      // Create a basic document definition
      const docDefinition = {
        pageSize: "A4",
        pageMargins: [40, 60, 40, 60],
        content: [
          {
            text: "KİŞİYE ÖZEL BESLENME PROGRAMI",
            style: "header",
            alignment: "center",
            margin: [0, 0, 0, 20],
          },
          {
            text: `Danışan: ${fullNameToUse}`,
            margin: [0, 0, 0, 10],
          },
          {
            text: `Tarih: ${formattedDietDate}`,
            margin: [0, 0, 0, 20],
          },
          {
            table: {
              headerRows: 1,
              widths: ["auto", "auto", "*", "*"],
              body: buildMealTableRows(pdfDataToUse),
            },
          },
          {
            text: `Su Tüketimi: ${pdfDataToUse.waterConsumption}`,
            margin: [0, 20, 0, 10],
          },
          {
            text: `Fiziksel Aktivite: ${pdfDataToUse.physicalActivity}`,
            margin: [0, 0, 0, 10],
          },
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
          },
        },
        defaultStyle: {
          font: "Roboto"
        },
      };

      console.log("About to create PDF");
      
      // Try downloading the PDF instead of opening it
      window.pdfMake.createPdf(docDefinition).download("beslenme-programi.pdf");
      
      console.log("PDF download initiated");
    } catch (error) {
      console.error("Error generating PDF:", error);
      let errorMessage = "Bilinmeyen bir hata oluştu";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      alert("PDF oluşturulurken bir hata oluştu: " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to load pdfMake scripts from CDN
  const loadPdfMakeScripts = async () => {
    // Only load if not already loaded
    if (window.pdfMake) {
      return;
    }

    // Load pdfmake.min.js
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load pdfMake script"));
      document.head.appendChild(script);
    });

    // Load vfs_fonts.js
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js";
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load vfs_fonts script"));
      document.head.appendChild(script);
    });

    // Configure pdfMake with better font support for Turkish characters and emojis
    if (window.pdfMake) {
      console.log("Configuring fonts for pdfMake");
      // Use standard fonts that are more reliable
      window.pdfMake.fonts = {
        // Default font
        Roboto: {
          normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
          bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
          italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
          bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
        }
      };
      
      // Set defaultStyle to use Roboto
      const originalCreatePdf = window.pdfMake.createPdf;
      window.pdfMake.createPdf = function(docDefinition) {
        // Make sure default style exists
        docDefinition.defaultStyle = docDefinition.defaultStyle || {};
        docDefinition.defaultStyle.font = 'Roboto';
        
        return originalCreatePdf.call(this, docDefinition);
      };
    }
  };

  // Helper function to sanitize any text for the PDF
  const sanitizeText = (text: string | null | undefined) => {
    if (!text) return '';
    // Basic sanitization to remove special characters
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  };

  // Helper function to build meal table rows - keep this simple
  function buildMealTableRows(dietData: any) {
    // First row is the header
    const rows = [
      [
        { text: "Öğün", style: "tableHeader" },
        { text: "Saat", style: "tableHeader" },
        { text: "Menü", style: "tableHeader" },
        { text: "Açıklama", style: "tableHeader" },
      ],
    ];

    // Add rows for each meal from the diet data
    if (dietData.ogunler && Array.isArray(dietData.ogunler) && dietData.ogunler.length > 0) {
      dietData.ogunler.forEach((ogun: any) => {
        // Simple sanitization for safety
        const name = sanitizeText(ogun.name) || "";
        const time = sanitizeText(ogun.time) || "";
        const menuText = formatMenuItems(ogun.menuItems);
        const notes = sanitizeText(ogun.notes) || "";

        rows.push([
          { text: name, style: "tableCell" },
          { text: time, style: "tableCell" },
          { text: menuText, style: "tableCell" },
          { text: notes, style: "tableCell" },
        ]);
      });
    } else {
      // Add an empty row if no meals data
      rows.push([
        { text: "Veri yok", style: "tableCell" },
        { text: "", style: "tableCell" },
        { text: "", style: "tableCell" },
        { text: "", style: "tableCell" },
      ]);
    }

    return rows;
  }

  // Helper to format menu items in a simple way
  function formatMenuItems(items: string[] | undefined) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return "";
    }

    // Simple join with newlines
    return items
      .filter((item) => item && item.trim() !== "")
      .map((item) => `- ${sanitizeText(item)}`)
      .join("\n");
  }

  return (
    <Button
      type="button"
      onClick={generatePDF}
      disabled={isLoading}
      className={`no-print bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors duration-200 shadow-sm flex items-center px-4 py-2 ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          PDF Yükleniyor...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 mr-2" />
          Direkt PDF Oluştur
        </>
      )}
    </Button>
  );
};

// Add this to make TypeScript happy with the global pdfMake
declare global {
  interface Window {
    pdfMake: any;
  }
}

export default DirectPDFButton;
