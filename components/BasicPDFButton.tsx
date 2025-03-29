import { useState } from "react";
import { Button } from "./ui/button";

interface BasicPDFButtonProps {
  dietData: any;
}

const BasicPDFButton = ({ dietData }: BasicPDFButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      
      // Load jsPDF from CDN
      if (!window.jspdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load jsPDF script'));
          document.head.appendChild(script);
        });
      }
      
      if (!window.jspdf) {
        throw new Error('jsPDF is not available after loading script');
      }
      
      // Create a new jsPDF instance
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
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
      
      // Add content to PDF
      let y = 20;
      
      // Title
      doc.setFontSize(16);
      doc.text("KİŞİYE ÖZEL BESLENME PROGRAMI", 105, y, { align: 'center' });
      y += 15;
      
      // Patient info
      doc.setFontSize(12);
      doc.text(`Adı Soyad: ${safeDietData.fullName}`, 20, y);
      y += 10;
      doc.text(`Diyet Tarihi: ${safeDietData.dietDate}`, 20, y);
      y += 10;
      doc.text(`Haftalık Sonuç: ${safeDietData.weeklyResult}`, 20, y);
      y += 10;
      doc.text(`Hedef: ${safeDietData.target}`, 20, y);
      y += 20;
      
      // Meals
      doc.setFontSize(14);
      doc.text("Öğünler", 20, y);
      y += 10;
      
      if (safeDietData.ogunler.length > 0) {
        safeDietData.ogunler.forEach(ogun => {
          doc.setFontSize(12);
          doc.text(`${ogun.name || ""} (${ogun.time || ""})`, 20, y);
          y += 7;
          
          if (ogun.menuItems && Array.isArray(ogun.menuItems)) {
            doc.setFontSize(10);
            ogun.menuItems.forEach(item => {
              doc.text(`- ${item}`, 30, y);
              y += 6;
            });
          }
          
          if (ogun.notes) {
            doc.setFontSize(10);
            doc.text(`Not: ${ogun.notes}`, 30, y);
            y += 10;
          } else {
            y += 5;
          }
        });
      }
      
      // Water and physical activity
      y += 5;
      doc.setFontSize(12);
      doc.text(`Su Tüketimi: ${safeDietData.waterConsumption}`, 20, y);
      y += 10;
      doc.text(`Fiziksel Aktivite: ${safeDietData.physicalActivity}`, 20, y);
      
      // Footer
      doc.setFontSize(8);
      doc.text("Eryaman 4.Etap Üç Şehitler Cad. Haznedatoğlu Bl. 173 Etimesgut/ANKARA", 105, 280, { align: 'center' });
      doc.text("0546 265 04 40 ezgievgin_dytsyn@hotmail.com www.ezgievgin.com", 105, 285, { align: 'center' });
      
      // Open PDF in a new window
      doc.output('dataurlnewwindow');
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("PDF oluşturulurken bir hata oluştu: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={generatePDF}
      disabled={isLoading}
      className="px-4 py-2 no-print bg-purple-500 text-white rounded hover:bg-purple-600"
    >
      {isLoading ? "PDF Yükleniyor..." : "PDF Oluştur"}
    </Button>
  );
};

// Add this to make TypeScript happy with the global jspdf
declare global {
  interface Window {
    jspdf: any;
  }
}

export default BasicPDFButton;
