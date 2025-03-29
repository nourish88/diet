import { Button } from "./ui/button";
import { useEffect, useState } from "react";

interface SimplePDFButtonProps {
  dietData: any;
}

const SimplePDFButton = ({ dietData }: SimplePDFButtonProps) => {
  const [isClient, setIsClient] = useState(false);

  // Only run on client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const generatePDF = async () => {
    try {
      // Only import pdfmake when the button is clicked
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      
      // Import fonts
      await import('pdfmake/build/vfs_fonts').then((vfs) => {
        // Try different ways to access vfs
        if (vfs.pdfMake && vfs.pdfMake.vfs) {
          pdfMake.vfs = vfs.pdfMake.vfs;
        } else if (vfs.default && vfs.default.pdfMake && vfs.default.pdfMake.vfs) {
          pdfMake.vfs = vfs.default.pdfMake.vfs;
        } else {
          console.error("VFS not found in imported module:", vfs);
          throw new Error("Could not load PDF fonts");
        }
      });

      // Safely access dietData with fallbacks
      const safeDietData = {
        fullName: dietData?.fullName || "İsimsiz Hasta",
        dietDate: dietData?.dietDate || new Date().toLocaleDateString(),
        weeklyResult: dietData?.weeklyResult || "",
        target: dietData?.target || "",
        ogunler: Array.isArray(dietData?.ogunler) ? dietData.ogunler : [],
        waterConsumption: dietData?.waterConsumption || "",
        physicalActivity: dietData?.physicalActivity || "",
      };

      // Define document
      const docDefinition = {
        pageSize: "A4",
        pageMargins: [40, 60, 40, 60],
        content: [
          {
            text: safeDietData.fullName,
            style: "header"
          },
          {
            text: "KİŞİYE ÖZEL BESLENME PROGRAMI",
            style: "subheader"
          },
          {
            text: `Diyet Tarihi: ${safeDietData.dietDate}`,
            style: "small"
          },
          {
            text: `Haftalık Sonuç: ${safeDietData.weeklyResult}`,
            style: "small"
          },
          {
            text: `Hedef: ${safeDietData.target}`,
            style: "small"
          },
          {
            text: "Öğünler",
            style: "subheader",
            margin: [0, 15, 0, 5]
          },
          // Simple table for meals
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', '*', '*'],
              body: [
                ['Öğün', 'Saat', 'Menü', 'Açıklama'],
                ...(safeDietData.ogunler || []).map(ogun => [
                  ogun.name || '',
                  ogun.time || '',
                  (ogun.menuItems || []).join('\n'),
                  ogun.notes || ''
                ])
              ]
            }
          },
          {
            text: `Su Tüketimi: ${safeDietData.waterConsumption}`,
            margin: [0, 15, 0, 5]
          },
          {
            text: `Fiziksel Aktivite: ${safeDietData.physicalActivity}`,
            margin: [0, 5, 0, 5]
          }
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 10]
          },
          subheader: {
            fontSize: 14,
            bold: true,
            margin: [0, 10, 0, 5]
          },
          small: {
            fontSize: 10,
            margin: [0, 5, 0, 0]
          }
        }
      };

      // Generate and open PDF
      pdfMake.createPdf(docDefinition).open();
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("PDF oluşturulurken bir hata oluştu: " + error.message);
    }
  };

  if (!isClient) {
    return null; // Don't render anything on server
  }

  return (
    <Button
      type="button"
      onClick={generatePDF}
