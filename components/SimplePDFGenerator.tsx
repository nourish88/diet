import { useState } from "react";
import { Button } from "./ui/button";

interface MenuItem {
  miktar: string;
  birim: string;
  besin: string;
}

interface Meal {
  name: string;
  time: string;
  items: MenuItem[];
  notes: string;
}

const SimplePDFGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [dietDate, setDietDate] = useState("");
  const [weeklyResult, setWeeklyResult] = useState("");
  const [target, setTarget] = useState("");
  const [waterConsumption, setWaterConsumption] = useState("");
  const [physicalActivity, setPhysicalActivity] = useState("");
  
  // Initialize with default meal structure
  const [meals, setMeals] = useState<Meal[]>([
    { name: "Uyanınca", time: "07:00", items: [{ miktar: "", birim: "", besin: "" }], notes: "" },
    { name: "Kahvaltı", time: "07:30", items: [{ miktar: "", birim: "", besin: "" }], notes: "" },
    { name: "İlk Ara Öğün", time: "10:00", items: [{ miktar: "", birim: "", besin: "" }], notes: "" },
    { name: "Öğlen", time: "15:30", items: [{ miktar: "", birim: "", besin: "" }], notes: "" },
    { name: "Akşam", time: "19:30", items: [{ miktar: "", birim: "", besin: "" }], notes: "" },
    { name: "Son Ara Öğün", time: "21:30", items: [{ miktar: "", birim: "", besin: "" }], notes: "" },
  ]);

  const handleMealChange = (index: number, field: string, value: string) => {
    setMeals(prev => 
      prev.map((meal, i) => 
        i === index ? { ...meal, [field]: value } : meal
      )
    );
  };

  const handleItemChange = (mealIndex: number, itemIndex: number, field: string, value: string) => {
    setMeals(prev => 
      prev.map((meal, i) => 
        i === mealIndex ? {
          ...meal,
          items: meal.items.map((item, j) => 
            j === itemIndex ? { ...item, [field]: value } : item
          )
        } : meal
      )
    );
  };

  const addMenuItem = (mealIndex: number) => {
    setMeals(prev => 
      prev.map((meal, i) => 
        i === mealIndex ? {
          ...meal,
          items: [...meal.items, { miktar: "", birim: "", besin: "" }]
        } : meal
      )
    );
  };

  const removeMenuItem = (mealIndex: number, itemIndex: number) => {
    setMeals(prev => 
      prev.map((meal, i) => 
        i === mealIndex ? {
          ...meal,
          items: meal.items.filter((_, j) => j !== itemIndex)
        } : meal
      )
    );
  };

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      
      // Format the data for the PDF
      const pdfData = {
        fullName: patientName,
        dietDate: dietDate,
        weeklyResult: weeklyResult,
        target: target,
        ogunler: meals.map(meal => ({
          name: meal.name,
          time: meal.time,
          menuItems: meal.items
            .filter(item => item.besin && item.besin.trim() !== "")
            .map(item => `${item.miktar || ""} ${item.birim || ""} ${item.besin || ""}`.trim()),
          notes: meal.notes
        })),
        waterConsumption: waterConsumption,
        physicalActivity: physicalActivity,
      };
      
      console.log("PDF data:", pdfData);

      // Load pdfmake and fonts from CDN
      await loadPdfMakeScripts();

      if (!window.pdfMake) {
        throw new Error("pdfMake is not available after loading scripts");
      }

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
                  { text: pdfData.fullName || "İsimsiz Hasta", style: "value" },
                  { text: pdfData.dietDate || new Date().toLocaleDateString(), style: "value" },
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
                  { text: pdfData.weeklyResult || "", style: "value" },
                  { text: pdfData.target || "", style: "value" },
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
              body: buildMealTableRows(pdfData),
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
                    text: pdfData.waterConsumption || "",
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
                    text: pdfData.physicalActivity || "",
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

      // Create and download the PDF
      window.pdfMake.createPdf(docDefinition).open();
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
      dietData.ogunler.forEach((ogun: any) => {
        // Ensure we have valid data for each cell
        const name = ogun.name || "";
        const time = ogun.time || "";
        const menuText = formatMenuItems(ogun.menuItems);
        const notes = ogun.notes || "";

        rows.push([
          { text: name },
          { text: time },
          { text: menuText },
          { text: notes },
        ]);
      });
    } else {
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
    if (!items || !Array.isArray(items) || items.length === 0) {
      return "";
    }

    // Filter out any empty items and join with newlines
    return items
      .filter((item) => item && item.trim() !== "")
      .map((item) => `- ${item}`)
      .join("\n");
  }

  return (
    <div className="p-4 border rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Basit PDF Oluşturucu</h2>
      
      {/* Patient info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Adı Soyad</label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Diyet Tarihi</label>
          <input
            type="text"
            value={dietDate}
            onChange={(e) => setDietDate(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Haftalık Sonuç</label>
          <input
            type="text"
            value={weeklyResult}
            onChange={(e) => setWeeklyResult(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hedef</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      {/* Meals */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Öğünler</h3>
        
        {meals.map((meal, mealIndex) => (
          <div key={mealIndex} className="border p-3 mb-3 rounded">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-sm font-medium mb-1">Öğün Adı</label>
                <input
                  type="text"
                  value={meal.name}
                  onChange={(e) => handleMealChange(mealIndex, 'name', e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Saat</label>
                <input
                  type="text"
