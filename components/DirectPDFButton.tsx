import { useEffect, useState } from "react";
import { Button, ButtonProps } from "./ui/button";
import { Diet } from "@/types/types";
import { FileText, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale/tr";

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

const DirectPDFButton = ({
  diet,
  pdfData,
  className,
  ...props
}: DirectPDFButtonProps) => {
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
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      alert(`PDF oluşturulamadı: ${error.message}`);
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

    // Load pdfmake with fallback
    try {
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"
      );
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"
      );

      // Configure fonts
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

  const preparePdfData = (diet?: Diet, pdfData?: PDFData): PDFData | null => {
    if (pdfData) return pdfData;
    if (!diet) return null;

    return {
      fullName: diet.client?.fullName || "Danışan Adı Belirtilmemiş",
      dietDate: diet.createdAt || new Date().toISOString(),
      weeklyResult: diet.weeklyResult || "Sonuç belirtilmemiş",
      target: diet.target || "Hedef belirtilmemiş",
      ogunler:
        diet.meals?.map((meal) => ({
          name: meal.name || "Öğün Adı Belirtilmemiş",
          time: meal.time || "Saat Belirtilmemiş",
          menuItems: meal.items?.map((item) => item.name) || [
            "Menü öğesi belirtilmemiş",
          ],
          notes: meal.notes || "",
        })) || [],
      waterConsumption: diet.waterConsumption || "Belirtilmemiş",
      physicalActivity: diet.physicalActivity || "Belirtilmemiş",
    };
  };

  const buildMealTableRows = (dietData: PDFData) => {
    const rows = [
      [
        { text: "ÖĞÜN", style: "tableHeader" },
        { text: "SAAT", style: "tableHeader" },
        { text: "MENÜ", style: "tableHeader" },
        { text: "NOTLAR", style: "tableHeader" },
      ],
    ];

    dietData.ogunler.forEach((ogun) => {
      const menuText = ogun.menuItems.join("\n• ") || "Belirtilmemiş";
      rows.push([
        { text: ogun.name || "Belirtilmemiş", style: "tableCell" },
        { text: ogun.time || "Belirtilmemiş", style: "tableCell" },
        { text: `• ${menuText}`, style: "tableCell" },
        {
          text: ogun.notes || "-",
          style: "tableCell",
          italics: ogun.notes ? false : true,
        },
      ]);
    });

    return rows;
  };

  const createDocDefinition = (pdfData: PDFData, logoUrl: string) => {
    const primaryColor = "#2c3e50"; // Dark blue for professional look
    const secondaryColor = "#7f8c8d"; // Gray for secondary elements
    const accentColor = "#16a085"; // Teal for accents
    const lightBg = "#f8f9fa"; // Light background
    const borderColor = "#e0e0e0";

    const formattedDietDate = formatDateTR(pdfData.dietDate);

    return {
      pageSize: "A4",
      pageMargins: [40, 120, 40, 80],
      header: {
        stack: [
          {
            columns: [
              {
                image: logoUrl,
                width: 80,
                margin: [40, 20, 0, 0],
                alignment: "left",
              },
              {
                stack: [
                  {
                    text: "BESLENME PROGRAMI",
                    fontSize: 18,
                    bold: true,
                    color: primaryColor,
                    alignment: "right",
                    margin: [0, 25, 40, 0],
                  },
                  {
                    text: "Uzm. Dyt. Ezgi Evgin Aktaş",
                    fontSize: 12,
                    color: secondaryColor,
                    alignment: "right",
                    margin: [0, 5, 40, 0],
                  },
                ],
              },
            ],
          },
          {
            canvas: [
              {
                type: "line",
                x1: 40,
                y1: 100,
                x2: 555,
                y2: 100,
                lineWidth: 1,
                lineColor: accentColor,
                dash: { length: 5 },
              },
            ],
          },
        ],
      },
      footer: (currentPage: number, pageCount: number) => ({
        stack: [
          {
            canvas: [
              {
                type: "line",
                x1: 40,
                y1: 0,
                x2: 555,
                y2: 0,
                lineWidth: 1,
                lineColor: accentColor,
                dash: { length: 5 },
              },
            ],
          },
          {
            columns: [
              {
                text: `Sayfa ${currentPage}/${pageCount}`,
                fontSize: 9,
                color: secondaryColor,
                margin: [40, 10, 0, 0],
              },
              {
                text: [
                  "Eryaman 4.Etap Üç Şehitler Cad. Haznedatoğlu Bl. 173 Etimesgut/ANKARA\n",
                  "Tel: 0546 265 04 40 • E-posta: ezgievgin_dytsyn@hotmail.com • Web: www.ezgievgin.com",
                ],
                alignment: "right",
                fontSize: 9,
                color: secondaryColor,
                margin: [0, 10, 40, 0],
              },
            ],
          },
        ],
        margin: [0, 20],
      }),
      content: [
        // Client Information Section
        {
          stack: [
            {
              text: "DANIŞAN BİLGİLERİ",
              style: "sectionHeader",
              margin: [0, 0, 0, 10],
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
          margin: [0, 20, 0, 20],
        },

        // Meals Section
        {
          text: "GÜNLÜK BESLENME PROGRAMI",
          style: "sectionHeader",
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ["15%", "15%", "45%", "25%"],
            body: buildMealTableRows(pdfData),
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === node.table.body.length ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i: number) => (i === 0 ? accentColor : borderColor),
            paddingTop: (i: number) => (i === 0 ? 8 : 5),
            paddingBottom: (i: number, node: any) =>
              i === node.table.body.length - 1 ? 8 : 5,
          },
          margin: [0, 0, 0, 20],
        },

        // Additional Information Section
        {
          stack: [
            {
              text: "GÜNLÜK TAKİP ÖNERİLERİ",
              style: "sectionHeader",
              margin: [0, 0, 0, 10],
            },
            {
              columns: [
                {
                  width: "50%",
                  stack: [
                    {
                      text: "SU TÜKETİMİ",
                      style: "followUpHeader",
                      margin: [0, 0, 0, 5],
                    },
                    {
                      text: pdfData.waterConsumption,
                      style: "followUpText",
                      margin: [0, 0, 0, 15],
                    },
                  ],
                },
                {
                  width: "50%",
                  stack: [
                    {
                      text: "FİZİKSEL AKTİVİTE",
                      style: "followUpHeader",
                      margin: [0, 0, 0, 5],
                    },
                    {
                      text: pdfData.physicalActivity,
                      style: "followUpText",
                      margin: [0, 0, 0, 15],
                    },
                  ],
                },
              ],
            },
          ],
        },

        // Signature Area
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
            {
              text: "Uzm. Dyt. Ezgi Evgin Aktaş",
              style: "signatureText",
              margin: [0, 0, 0, 0],
            },
          ],
          alignment: "right",
          margin: [0, 30, 40, 0],
        },
      ],
      styles: {
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: primaryColor,
          alignment: "left",
        },
        clientInfo: {
          fontSize: 12,
          color: primaryColor,
          lineHeight: 1.5,
        },
        followUpHeader: {
          fontSize: 12,
          bold: true,
          color: accentColor,
        },
        followUpText: {
          fontSize: 12,
          color: primaryColor,
          lineHeight: 1.4,
        },
        tableHeader: {
          fontSize: 11,
          bold: true,
          color: "#ffffff",
          fillColor: accentColor,
          alignment: "center",
          margin: [0, 5, 0, 5],
        },
        tableCell: {
          fontSize: 10,
          color: primaryColor,
          margin: [5, 3, 5, 3],
          lineHeight: 1.3,
        },
        signatureText: {
          fontSize: 12,
          color: primaryColor,
          italics: true,
        },
      },
      defaultStyle: {
        font: "Roboto",
        lineHeight: 1.2,
      },
    };
  };

  return (
    <Button
      type="button"
      onClick={generatePDF}
      disabled={isLoading}
      className={`
        no-print
        bg-gradient-to-r from-blue-600 to-teal-600
        hover:from-blue-700 hover:to-teal-700
        text-white
        rounded-md
        transition-all
        duration-200
        shadow-md
        hover:shadow-lg
        flex
        items-center
        justify-center
        px-6
        py-2.5
        min-w-[200px]
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          <span className="font-medium">PDF Hazırlanıyor...</span>
        </>
      ) : (
        <>
          <FileText className="w-5 h-5 mr-3" />
          <span className="font-medium">PDF Oluştur</span>
        </>
      )}
    </Button>
  );
};

declare global {
  interface Window {
    pdfMake: any;
  }
}

export default DirectPDFButton;
