import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Configure pdfmake printer and ensure fonts are available on disk
const PdfPrinter = require("pdfmake");
const pdfMakeVfsModule = require("pdfmake/build/vfs_fonts");

const fontOutputDir = path.join(process.cwd(), ".pdfmake-fonts");

function ensureFontFile(fontName: string): string {
  if (!fs.existsSync(fontOutputDir)) {
    fs.mkdirSync(fontOutputDir, { recursive: true });
  }

  const targetPath = path.join(fontOutputDir, fontName);
  if (!fs.existsSync(targetPath)) {
    const vfs =
      pdfMakeVfsModule?.pdfMake?.vfs || pdfMakeVfsModule?.vfs || pdfMakeVfsModule;
    const fontData = vfs?.[fontName];

    if (!fontData) {
      throw new Error(`Font ${fontName} not found in pdfmake vfs`);
    }

    const buffer = Buffer.from(fontData, "base64");
    fs.writeFileSync(targetPath, buffer);
  }

  return targetPath;
}

const fonts = {
  Roboto: {
    normal: ensureFontFile("Roboto-Regular.ttf"),
    bold: ensureFontFile("Roboto-Medium.ttf"),
    italics: ensureFontFile("Roboto-Italic.ttf"),
    bolditalics: ensureFontFile("Roboto-MediumItalic.ttf"),
  },
};

// Helper function to format date in Turkish
function formatDateTR(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Geçersiz Tarih";
    }
    return format(date, "d MMMM yyyy", { locale: tr });
  } catch (error) {
    console.error("Date parsing error:", error, "Input:", dateString);
    return "Geçersiz Tarih";
  }
}

// Interface definitions
interface MenuItem {
  miktar?: string;
  birim?: { name: string } | string;
  besin?: { name: string } | string;
}

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
  isImportantDateCelebrated?: boolean;
  importantDate?: {
    message: string;
  };
  dietitianNote?: string;
}

interface TableCell {
  text: string;
  style: string;
  alignment: string;
  colSpan?: number;
  bold?: boolean;
}

// Format menu item
function formatMenuItem(item: MenuItem | string): string {
  if (typeof item === "string") return item;
  const miktar = item.miktar ?? "";
  const birim = typeof item.birim === "string" ? item.birim : item.birim?.name ?? "";
  const besin = typeof item.besin === "string" ? item.besin : item.besin?.name ?? "";
  return `${miktar} ${birim} ${besin}`.trim();
}

// Prepare PDF data from database diet
function preparePdfDataFromDatabase(diet: any): PDFData | null {
  if (!diet) return null;

  // Extract client name
  let clientName = "İsimsiz Danışan";
  if (diet.client) {
    clientName = `${diet.client.name || ""} ${diet.client.surname || ""}`.trim() || "İsimsiz Danışan";
  }

  // Process meals (oguns)
  const processedMeals = (diet.oguns || []).map((ogun: any) => {
    // Process menu items
    const menuItems = (ogun.items || []).map((item: any) => {
      const besinName = typeof item.besin === "string" ? item.besin : item.besin?.name || "";
      const birimName = typeof item.birim === "string" ? item.birim : item.birim?.name || "";
      const miktar = item.miktar || "";
      return formatMenuItem({ miktar, birim: birimName, besin: besinName });
    }).filter(Boolean);

    return {
      name: ogun.name || "Belirtilmemiş",
      time: ogun.time || "",
      menuItems: menuItems.length > 0 ? menuItems : ["Belirtilmemiş"],
      notes: ogun.detail || "",
    };
  });

  return {
    fullName: clientName,
    dietDate: diet.tarih || diet.createdAt || new Date().toISOString(),
    weeklyResult: diet.sonuc || diet.Sonuc || "Sonuç belirtilmemiş",
    target: diet.hedef || diet.Hedef || "Hedef belirtilmemiş",
    ogunler: processedMeals,
    waterConsumption: diet.su || diet.Su || "Belirtilmemiş",
    physicalActivity: diet.fizik || diet.Fizik || "Belirtilmemiş",
    isBirthdayCelebration: diet.isBirthdayCelebration || false,
    isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
    importantDate: diet.isImportantDateCelebrated && diet.importantDateMessage
      ? { message: diet.importantDateMessage }
      : undefined,
    dietitianNote: diet.dietitianNote || "",
  };
}

// Build meal table rows
function buildMealTableRows(dietData: PDFData): TableCell[][] {
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
}

// Create document definition
function createDocDefinition(pdfData: PDFData, backgroundDataUrl: string) {
  // Color scheme - changed to pink color
  const primaryColor = "#d32d7e";
  const secondaryColor = "#64748b";
  const borderColor = "#e2e8f0";
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
      color: "#d32d7e",
      margin: [0, 5, 0, 0],
    });
  }
  
  if (pdfData.isImportantDateCelebrated && pdfData.importantDate?.message) {
    celebrationsContent.push({
      text: `🎉 ${pdfData.importantDate.message}`,
      style: "celebration",
      color: "#D97706",
      margin: [0, pdfData.isBirthdayCelebration ? 3 : 5, 0, 0],
    });
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

  const content: PDFContentItem[] = [
    // Title
    {
      text: "KİŞİYE ÖZEL BESLENME PLANI",
      alignment: "center",
      style: "titleStyle",
      margin: [0, 20, 0, 12],
    },
    // Client info
    {
      text: `${pdfData.fullName} / ${formattedDietDate}`,
      style: "clientInfoCentered",
      alignment: "center",
      margin: [0, 0, 0, 15],
    },
    // Logo watermark
    ...(backgroundDataUrl
      ? [
          {
            image: backgroundDataUrl,
            width: 300,
            opacity: 0.1,
            alignment: "center",
            margin: [0, 20, 0, -25],
            absolutePosition: { x: 50, y: 300 },
          },
        ]
      : []),
    // Meal table
    {
      table: {
        headerRows: 1,
        widths: ["12%", "8%", "38%", "42%"],
        body: buildMealTableRows(pdfData),
      },
      layout: {
        hLineWidth: (i: number, node: any) =>
          i === 0 || i === node.table.body.length ? 1 : 0.5,
        vLineWidth: () => 0.5,
        hLineColor: (i: number) => (i === 0 ? primaryColor : borderColor),
        vLineColor: () => borderColor,
        fillColor: function (rowIndex: number) {
          if (rowIndex === 0) {
            return primaryColor;
          }
          return rowIndex % 2 === 1 ? "#fce7f3" : null;
        },
        paddingTop: (i: number) => (i === 0 ? 6 : 4),
        paddingBottom: (i: number) => (i === 0 ? 6 : 4),
        paddingLeft: () => 6,
        paddingRight: () => 6,
      },
      margin: [0, 0, 0, 10],
    },
  ];

  // Add Dietitian Note if exists
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

  // Add Celebrations if exist
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
    styles: {
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: primaryColor,
        alignment: "left",
        borderBottom: {
          width: 1,
          color: primaryColor,
        },
        margin: [0, 3, 0, 5],
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
      tableCellItalic: {
        fontSize: 11,
        italics: true,
        color: "#9ca3af",
      },
      celebration: {
        fontSize: 14,
        bold: true,
        alignment: "center",
      },
      signatureText: {
        fontSize: 13,
        bold: true,
        color: primaryColor,
        alignment: "right",
        decoration: "underline",
        decorationStyle: "solid",
        decorationColor: primaryColor,
      },
      footerText: {
        fontSize: 9,
        color: secondaryColor,
        alignment: "center",
      },
      clientInfoCentered: {
        fontSize: 16,
        color: "#374151",
        bold: true,
        lineHeight: 1.2,
      },
      dietitianNote: {
        fontSize: 10,
        color: secondaryColor,
        lineHeight: 1.3,
      },
      titleStyle: {
        fontSize: 20,
        bold: true,
        color: primaryColor,
      },
    },
    header: backgroundDataUrl
      ? {
          columns: [
            {
              image: backgroundDataUrl,
              width: 127,
              margin: [30, 15, 0, 0],
            },
            {
              text: "",
              alignment: "center",
              fontSize: 16,
              bold: true,
              margin: [0, 25, 0, -25],
              color: primaryColor,
            },
          ],
        }
      : undefined,
    footer: function () {
      return {
        columns: [
          {
            text:
              "Eryaman 4.Etap Üç Şehitler Cad. Haznedatoğlu Bl. 173 Etimesgut/ANKARA\n" +
              "Tel: 0546 265 04 40 • E-posta: ezgievgin_dytsyn@hotmail.com",
            style: "footerText",
            alignment: "center",
            margin: [30, 0, 30, 0],
          },
        ],
        margin: [0, 10, 0, 0],
      };
    },
    defaultStyle: {
      font: "Roboto",
      lineHeight: 1.2,
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dietId = parseInt(id);

    if (isNaN(dietId)) {
      return NextResponse.json({ error: "Invalid diet ID" }, { status: 400 });
    }

    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      include: {
        client: true,
        oguns: {
          include: {
            items: {
              include: {
                besin: true,
                birim: true,
              },
            },
          },
        },
      },
    });

    if (!diet) {
      return NextResponse.json({ error: "Diet not found" }, { status: 404 });
    }

    // Load logo as base64
    const logoPath = path.join(process.cwd(), "public", "ezgi_evgin.png");
    let backgroundDataUrl = "";
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      backgroundDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }

    // Prepare PDF data
    const pdfData = preparePdfDataFromDatabase(diet);
    if (!pdfData) {
      return NextResponse.json(
        { error: "Failed to prepare PDF data" },
        { status: 500 }
      );
    }

    // Create document definition
    const docDefinition = createDocDefinition(pdfData, backgroundDataUrl);

    // Create PDF using pdfmake
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      pdfDoc.on("error", (error: Error) => {
        reject(error);
      });
    });

    // Create response with PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=beslenme-programi-${dietId}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "");
    return NextResponse.json(
      {
        error: "Error generating PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
