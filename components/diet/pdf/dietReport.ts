import type { Column, Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import type { DietPdfAssets } from "./pdfAssets";
import { formatDateTR, type DietPdfData } from "./pdfData";

const accent = "#913461";
const ink = "#342832";
const muted = "#685F65";

export function createDietReport(
  diet: DietPdfData,
  assets: DietPdfAssets,
): TDocumentDefinitions {
  const hasMealNotes = diet.ogunler.some((meal) => meal.notes.trim() && meal.notes.trim() !== "-");
  const headings = ["Öğün", "Saat", "Menü", ...(hasMealNotes ? ["Notlar"] : [])];
  const meals: TableCell[][] = [
    headings.map((text) => ({ text, bold: true, fontSize: 10, color: "#FFFFFF" })),
    ...diet.ogunler.map((meal) => [
      { text: meal.name || "—", bold: true },
      { text: meal.time || "—", color: muted },
      { stack: meal.menuItems.map((text) => ({ text, marginBottom: 2 })) },
      ...(hasMealNotes ? [{ text: meal.notes, color: muted }] : []),
    ]),
  ];
  const content: Content[] = [
    {
      columns: [
        { width: 102, image: assets.logo, fit: [102, 47] },
        { width: "*", marginTop: 11, stack: [
          { text: "Kişiye Özel Beslenme Planı", fontSize: 18, bold: true, color: accent },
          { text: diet.fullName, fontSize: 13, marginTop: 3 },
        ] },
        { width: "auto", text: formatDateTR(diet.dietDate), alignment: "right", fontSize: 10, color: muted, marginTop: 16 },
      ],
      columnGap: 7,
      marginBottom: 14,
    },
  ];

  const details = [
    ["Hedef", diet.target],
    ["Haftalık sonuç", diet.weeklyResult],
  ].filter(([, value]) => value?.trim());
  if (details.length) {
    const columns: Column[] = details.map(([label, value]) => ({
      width: "*",
      stack: [
        { text: label, style: "label" },
        { text: value, marginTop: 2 },
      ],
    }));
    if (diet.weeklyResult?.trim() && assets.nazar) {
      columns.push({ width: 17, image: assets.nazar, fit: [17, 17] });
    }
    content.push({ columns, columnGap: 14, marginBottom: 12 });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: hasMealNotes ? [81, 36, "*", "32%"] : [81, 36, "*"],
      body: meals,
    },
    layout: {
      fillColor: (row) => row === 0 ? accent : row % 2 ? "#F4ECF0" : null,
      fillOpacity: (row) => row === 0 ? 1 : 0.5,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 7,
      paddingRight: () => 7,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  });

  for (const [label, value] of [
    ["Su tüketimi", diet.waterConsumption],
    ["Fiziksel aktivite", diet.physicalActivity],
    ["Diyetisyen notu", diet.dietitianNote || ""],
  ]) {
    if (value?.trim()) {
      content.push({
        columns: [{ width: 92, text: label, style: "label" }, { width: "*", text: value }],
        columnGap: 8,
        marginTop: 9,
      });
    }
  }
  if (diet.isBirthdayCelebration) {
    content.push({ text: "Doğum gününüz kutlu olsun! İyi ki doğdunuz.", color: accent, marginTop: 10 });
  }
  if (diet.isImportantDateCelebrated && diet.importantDate?.message) {
    content.push({ text: diet.importantDate.message, color: accent, marginTop: 10 });
  }
  content.push({ text: "Dyt. Ezgi Evgin Aktaş", alignment: "right", bold: true, color: accent, marginTop: 13 });

  return {
    pageSize: "A4",
    pageMargins: [32, 24, 32, 48],
    images: { brandSymbol: assets.symbol },
    background: (_page, size) => {
      const width = size.width * 0.66;
      const height = width * (630 / 560); // Native aspect ratio of the standalone symbol.
      return {
        image: "brandSymbol",
        width,
        opacity: 0.075,
        absolutePosition: { x: (size.width - width) / 2, y: (size.height - height) / 2 },
      };
    },
    content,
    styles: { label: { bold: true, color: accent, fontSize: 10 } },
    defaultStyle: { font: "Roboto", fontSize: 10.5, lineHeight: 1.13, color: ink },
    footer: (page, pages) => ({
      columns: [
        { width: "*", text: "Eryaman Altay Mah. Atayıldız Plaza No:70 Etimesgut/ANKARA\n0546 265 04 40  •  ezgievgin_dytsyn@hotmail.com" },
        { width: "auto", text: `${page} / ${pages}`, alignment: "right" },
      ],
      fontSize: 8,
      color: muted,
      margin: [32, 9, 32, 0],
    }),
  };
}
