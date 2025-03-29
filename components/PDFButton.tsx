import { useState } from "react";
import { Button } from "./ui/button";
import { useDietStore } from "@/store/store";

const PDFButton = () => {
  const diet = useDietStore((state) => state.diet);

  console.log(diet);
  const [isLoading, setIsLoading] = useState(false);

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      console.log("Generating PDF with data:", diet);

      // Load pdfmake and fonts from CDN
      await loadPdfMakeScripts();

      if (!window.pdfMake) {
        throw new Error("pdfMake is not available after loading scripts");
      }

      // Safely access diet data
      const safeDietData = {
        fullName: diet.fullName || "İsimsiz Hasta",
        dietDate: diet.dietDate || new Date().toLocaleDateString(),
        weeklyResult: diet.weeklyResult || "",
        target: diet.target || "",
        ogunler: diet.ogunler || [],
        waterConsumption: diet.waterConsumption || "",
        physicalActivity: diet.physicalActivity || "",
      };

      console.log("Safe diet data:", safeDietData);
      console.log("Meals data:", safeDietData.ogunler);

      // Build table rows with explicit logging
      const tableRows = buildMealTableRows(safeDietData);
      console.log("Generated table rows:", tableRows);

      // Define the document definition
      const docDefinition = {
        pageSize: "A4",
        pageMargins: [40, 60, 40, 60],
        content: [
          // Patient info and results section
          {
            columns: [
              {
                width: "50%",
                stack: [
                  { text: "Adı Soyad", bold: true, style: "label" },
                  { text: "Diyet Tarihi", bold: true, style: "label" },
                ],
              },
              {
                width: "5%",
                stack: [
                  { text: ":", style: "label" },
                  { text: ":", style: "label" },
                ],
              },
              {
                width: "*",
                stack: [
                  { text: safeDietData.fullName, style: "value" },
                  { text: safeDietData.dietDate, style: "value" },
                ],
              },
              {
                width: "20%",
                stack: [
                  { text: "Haftalık Sonuç", bold: true, style: "label" },
                  { text: "Hedef", bold: true, style: "label" },
                ],
              },
              {
                width: "5%",
                stack: [
                  { text: ":", style: "label" },
                  { text: ":", style: "label" },
                ],
              },
              {
                width: "*",
                stack: [
                  { text: safeDietData.weeklyResult, style: "value" },
                  { text: safeDietData.target, style: "value" },
                ],
              },
            ],
          },
          // Program title
          {
            text: "KİŞİYE ÖZEL BESLENME PROGRAMI",
            style: "programTitle",
            alignment: "center",
            margin: [0, 15, 0, 10],
          },
          // Diet schedule table
          {
            table: {
              headerRows: 1,
              widths: ["20%", "10%", "35%", "35%"],
              body: tableRows,
            },
          },
          // Water consumption
          {
            table: {
              widths: ["30%", "*"],
              body: [
                [
                  { text: "Su Tüketimi", style: "tableCellLabel" },
                  {
                    text: safeDietData.waterConsumption,
                    style: "tableCellValue",
                  },
                ],
              ],
            },
            margin: [0, 15, 0, 0],
          },
          // Physical activity
          {
            table: {
              widths: ["30%", "*"],
              body: [
                [
                  { text: "Fiziksel Aktivite", style: "tableCellLabel" },
                  {
                    text: safeDietData.physicalActivity,
                    style: "tableCellValue",
                  },
                ],
              ],
            },
            margin: [0, 5, 0, 0],
          },
        ],
        footer: {
          columns: [
            {
              text: "Eryaman 4.Etap Üç Şehitler Cad. Haznedatoğlu Bl. 173 Etimesgut/ANKARA",
              alignment: "center",
              fontSize: 8,
              margin: [0, 10, 0, 5],
            },
          ],
          stack: [
            {
              text: "0546 265 04 40 ezgievgin_dytsyn@hotmail.com www.ezgievgin.com",
              alignment: "center",
              fontSize: 8,
            },
          ],
        },
        styles: {
          programTitle: {
            fontSize: 14,
            bold: true,
            color: "#000080", // Navy blue
          },
          label: {
            fontSize: 10,
            margin: [0, 5, 0, 0],
          },
          value: {
            fontSize: 10,
            margin: [0, 5, 0, 0],
          },
          tableHeader: {
            fontSize: 11,
            bold: true,
            fillColor: "#f2f2f2",
            margin: [0, 5, 0, 5],
          },
          tableCellLabel: {
            fontSize: 10,
            bold: true,
            fillColor: "#f2f2f2",
          },
          tableCellValue: {
            fontSize: 10,
          },
        },
      };

      console.log("Document definition created");

      // Create and download the PDF
      window.pdfMake.createPdf(docDefinition).open();
      console.log("PDF opened");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("PDF oluşturulurken bir hata oluştu: " + error.message);
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
  };

  // Helper function to build meal table rows
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
    if (
      dietData.ogunler &&
      Array.isArray(dietData.ogunler) &&
      dietData.ogunler.length > 0
    ) {
      console.log(`Processing ${dietData.ogunler.length} meals`);

      dietData.ogunler.forEach((ogun: any, index: number) => {
        console.log(`Processing meal ${index + 1}:`, ogun);

        // Ensure we have valid data for each cell
        const name = ogun.name || "";
        const time = ogun.time || "";
        const menuText = formatMenuItems(ogun.menuItems);
        const notes = ogun.notes || "";

        console.log(`Meal ${index + 1} formatted data:`, {
          name,
          time,
          menuText,
          notes,
        });

        rows.push([
          { text: name },
          { text: time },
          { text: menuText },
          { text: notes },
        ]);
      });
    } else {
      console.log("No meals data available or empty array");
      // Add an empty row if no meals data
      rows.push([
        { text: "Veri yok" },
        { text: "" },
        { text: "" },
        { text: "" },
      ]);
    }

    return rows;
  }

  // Helper to format menu items
  function formatMenuItems(items: string[] | undefined) {
    console.log("formatMenuItems received:", items);

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log("No menu items to format");
      return "";
    }

    // Filter out any empty items and join with newlines
    const formattedItems = items
      .filter((item) => item && item.trim() !== "")
      .map((item) => `- ${item}`)
      .join("\n");

    console.log("Formatted menu items:", formattedItems);
    return formattedItems;
  }

  return (
    <Button onClick={generatePDF} disabled={isLoading}>
      {isLoading ? "PDF Yükleniyor..." : "Pdf Oluştur"}
    </Button>
  );
};

// Add this to make TypeScript happy with the global pdfMake
declare global {
  interface Window {
    pdfMake: any;
  }
}

export default PDFButton;
