import DirectPDFButton from "./DirectPDFButton";
import { Button } from "./ui/button";
import dynamic from "next/dynamic";
import { Diet } from "@/types/types";
import { Save, Loader2 } from "lucide-react";
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
  phoneNumber?: string; // Add this prop
}

const DietFormActions = ({
  onGeneratePDF,
  dietData,
  diet,
  clientId,
  onSaveToDatabase,
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

  // Log the diet ID for debugging
  console.log("Diet ID in DietFormActions:", diet?.id);

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
      <DirectPDFButton
        pdfData={{
          id: diet?.id, // Ensure diet ID is passed
          fullName: dietData.fullName,
          dietDate: dietData.dietDate,
          weeklyResult: dietData.weeklyResult,
          target: dietData.target,
          ogunler: dietData.ogunler.map((ogun) => ({
            name: ogun.name,
            time: ogun.time,
            menuItems: ogun.menuItems,
            notes: ogun.detail || ogun.notes || "",
            detail: ogun.detail || "",
          })),
          waterConsumption: diet.Su,
          physicalActivity: diet.Fizik,
          dietitianNote: diet.dietitianNote,
          isBirthdayCelebration: diet.isBirthdayCelebration || false,
          isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
        }}
        variant="default"
        size="lg"
        className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white border-none h-11 px-6 py-2"
        phoneNumber={validPhoneNumber} // Pass the formatted phone number
        dietId={diet?.id} // Explicitly pass the diet ID
        disabled={!diet?.id || !validPhoneNumber} // Disable if either diet ID or phone number is missing
        onError={(error) => {
          toast({
            title: "Hata",
            description:
              error || "WhatsApp raporu gönderilirken bir hata oluştu",
            variant: "destructive",
          });
        }}
      />

      {onSaveToDatabase && (
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={handleSaveToDatabase}
          disabled={isSaving || !clientId}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white border-none h-11 px-6 py-2"
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
      )}
    </div>
  );
};

export default DietFormActions;
