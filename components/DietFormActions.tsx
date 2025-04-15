import DirectPDFButton from "./DirectPDFButton";
import { Button } from "./ui/button";
import dynamic from "next/dynamic";
import { Diet } from "@/types/types";
import { Save, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "./ui/use-toast";

// Create a separate component for the PDF button to ensure client-side only rendering

interface DietFormActionsProps {
  onAddOgun: () => void;
  onGeneratePDF: (formattedDietData: any) => void;
  dietData: any;
  diet: Diet;
  clientId?: number;
  onSaveToDatabase: () => Promise<void>;
  disabled?: boolean;
  phoneNumber?: string;
}

const DietFormActions = ({
  onAddOgun,
  onGeneratePDF,
  dietData,
  diet,
  clientId,
  onSaveToDatabase,
  disabled = false,
  phoneNumber,
}: DietFormActionsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Add validation for phone number
  const formattedPhoneNumber = phoneNumber?.replace(/\D/g, ""); // Remove non-digits

  // Ensure phone number starts with country code
  const validPhoneNumber = formattedPhoneNumber?.startsWith("90")
    ? formattedPhoneNumber
    : formattedPhoneNumber
    ? `90${formattedPhoneNumber}`
    : undefined;

  // Check if diet is saved by verifying it has an ID
  const isDietSaved = Boolean(diet?.id);

  const handleSaveToDatabase = async () => {
    if (!clientId) {
      toast({
        title: "Uyarı",
        description: "Danışan seçilmeden kayıt yapılamaz.",
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
        <Plus className="h-4 w-4 mr-2" />
        Öğün Ekle
      </Button>

      <DirectPDFButton
        pdfData={{
          id: diet?.id,
          fullName: dietData.fullName,
          dietDate: dietData.dietDate,
          weeklyResult: dietData.weeklyResult,
          target: dietData.target,
          ogunler: dietData.ogunler,
          waterConsumption: diet.Su,
          physicalActivity: diet.Fizik,
          dietitianNote: diet.dietitianNote,
          isBirthdayCelebration: diet.isBirthdayCelebration || false,
          isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
        }}
        variant="default"
        className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white border-none"
        phoneNumber={validPhoneNumber}
        dietId={diet?.id}
        disabled={!diet?.id || !validPhoneNumber}
        onError={(error) => {
          toast({
            title: "Hata",
            description:
              error || "WhatsApp raporu gönderilirken bir hata oluştu",
            variant: "destructive",
          });
        }}
      />

      <Button
        type="button"
        variant="default"
        onClick={handleSaveToDatabase}
        disabled={isSaving || !clientId}
        className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white border-none"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Kaydediliyor...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {isDietSaved ? "Güncelle" : "Kaydet"}
          </>
        )}
      </Button>
    </div>
  );
};

export default DietFormActions;
