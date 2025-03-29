import BasicPDFButton from "./BasicPDFButton";
import DirectPDFButton from "./DirectPDFButton";
import { Button } from "./ui/button";
import dynamic from "next/dynamic";
import { Diet } from "@/types/types";
import { Plus, Save, FileText } from "lucide-react";
import { PDFData } from "./DirectPDFButton";
import { useState } from "react";
import { useToast } from "./ui/use-toast";

// Create a separate component for the PDF button to ensure client-side only rendering
const PDFButton = dynamic(() => import("./PDFButton"), {
  ssr: false, // This ensures the component only renders on client-side
  loading: () => (
    <button disabled className="px-4 py-2 bg-gray-400 text-white rounded">
      PDF Yükleniyor...
    </button>
  ),
});

interface DietFormActionsProps {
  onAddOgun: () => void;
  onGeneratePDF: () => void;
  dietData: PDFData;
  // For database saving
  diet?: Diet;
  clientId?: number;
  onSaveToDatabase?: () => Promise<void>;
}

const DietFormActions = ({
  onAddOgun,
  dietData,
  onSaveToDatabase,
  clientId,
}: DietFormActionsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveToDatabase = async () => {
    if (!onSaveToDatabase) {
      toast({
        title: "Hata",
        description: "Veritabanına kaydetme işlevi tanımlanmamış.",
        variant: "destructive",
      });
      return;
    }

    if (!clientId) {
      toast({
        title: "Uyarı",
        description: "Müşteri seçilmeden kayıt yapılamaz.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveToDatabase();
      toast({
        title: "Başarılı",
        description: "Beslenme programı veritabanına kaydedildi.",
        variant: "default",
      });
    } catch (error) {
      console.error("Veritabanına kaydetme hatası:", error);
      toast({
        title: "Hata",
        description: "Veritabanına kaydetme sırasında bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 mt-6 justify-start">
      <Button
        type="button"
        variant="outline"
        onClick={onAddOgun}
        className="bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
      >
        Öğün Ekle
      </Button>

      <Button
        type="submit"
        id="notPrintable"
        className="no-print bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200 shadow-sm flex items-center px-4 py-2"
      >
        <Save className="w-4 h-4 mr-2" />
        Diyeti Kaydet
      </Button>

      <div className="no-print">
        <DirectPDFButton
          pdfData={dietData}
          variant="default"
          className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white border-none"
        />
      </div>

      {onSaveToDatabase && (
        <Button
          type="button"
          variant="default"
          onClick={handleSaveToDatabase}
          disabled={isSaving || !clientId}
          className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white border-none"
        >
          {isSaving ? "Kaydediliyor..." : "Veritabanına Kaydet"}
        </Button>
      )}
    </div>
  );
};

export default DietFormActions;
