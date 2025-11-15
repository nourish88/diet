import DirectPDFButton from "./DirectPDFButton";
import { Button } from "./ui/button";
import { Diet } from "@/types/types";
import { Save, Loader2, Plus, FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "./ui/use-toast";
import TemplateService from "@/services/TemplateService";
import PresetService from "@/services/PresetService";

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
  importantDateId?: number | null;
  isUpdateMode?: boolean;
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
  isUpdateMode = false,
}: DietFormActionsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);
  const { toast } = useToast();

  // Add validation for phone number
  const formattedPhoneNumber = phoneNumber?.replace(/\D/g, ""); // Remove non-digits

  // Ensure phone number starts with country code
  const validPhoneNumber = formattedPhoneNumber?.startsWith("90")
    ? formattedPhoneNumber
    : formattedPhoneNumber
    ? `90${formattedPhoneNumber}`
    : undefined;

  // Button text: If in update mode, show "Güncelle", otherwise show "Kaydet"

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

  console.log("DietFormActions - Received props:", {
    isImportantDateCelebrated: diet.isImportantDateCelebrated,
    importantDateId: diet.importantDateId,
  });

  const handleAutoGeneratePresets = async () => {
    const confirmed = confirm(
      "Son 30 diyetinizden otomatik olarak preset oluşturulacak. Devam etmek istiyor musunuz?"
    );
    
    if (!confirmed) return;

    setIsGeneratingPresets(true);
    try {
      const result = await PresetService.autoGeneratePresets();

      toast({
        title: "Başarılı",
        description: `${result.presets.length} adet preset oluşturuldu! (${result.patternsDetected} pattern tespit edildi)`,
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error auto-generating presets:", error);
      toast({
        title: "Hata",
        description: error.message || "Preset oluşturulurken bir hata oluştu. En az 5 diyet gerekli.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPresets(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const templateName = prompt("Şablon adı girin:");
    if (!templateName || !templateName.trim()) return;

    const category = prompt("Kategori (opsiyonel, örn: kilo_verme):");

    setIsSavingTemplate(true);
    try {
      // Convert diet to template format
      const templateData = {
        name: templateName.trim(),
        description: "",
        category: category?.trim() || undefined,
        su: diet.Su,
        fizik: diet.Fizik,
        hedef: diet.Hedef,
        sonuc: diet.Sonuc,
        oguns: diet.Oguns.map((ogun) => ({
          name: ogun.name,
          time: ogun.time,
          detail: ogun.detail || "",
          order: ogun.order || 0,
          items: ogun.items
            .filter((item) => {
              const besinName =
                typeof item.besin === "object" ? item.besin?.name : item.besin;
              return besinName && besinName.trim() !== "";
            })
            .map((item) => ({
              besinName:
                typeof item.besin === "object"
                  ? item.besin?.name || ""
                  : item.besin || "",
              miktar: item.miktar || "",
              birim:
                typeof item.birim === "object"
                  ? item.birim?.name || ""
                  : item.birim || "",
            })),
        })).filter((ogun) => ogun.items.length > 0), // Only save oguns with items
      };

      await TemplateService.createTemplate(templateData);

      toast({
        title: "Başarılı",
        description:
          "Şablon oluşturuldu! /sablonlar sayfasından görüntüleyebilirsiniz.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Hata",
        description: error.message || "Şablon kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6 justify-start">
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
        importantDateId={diet?.importantDateId}
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
            {isUpdateMode ? "Güncelle" : "Kaydet"}
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleSaveAsTemplate}
        disabled={isSavingTemplate}
        className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
      >
        {isSavingTemplate ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Kaydediliyor...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Şablon Olarak Kaydet
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleAutoGeneratePresets}
        disabled={isGeneratingPresets}
        className="border-purple-600 text-purple-600 hover:bg-purple-50"
      >
        {isGeneratingPresets ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Oluşturuluyor...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Otomatik Preset Oluştur
          </>
        )}
      </Button>
    </div>
  );
};

export default DietFormActions;
