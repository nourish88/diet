import DirectPDFButton, { DirectPDFButtonHandle } from "./DirectPDFButton";
import { Button } from "./ui/button";
import { Diet } from "@/types/types";
import { Save, Loader2, Plus, FileText, Sparkles, Download } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "./ui/use-toast";
import TemplateService from "@/services/TemplateService";
import PresetService from "@/services/PresetService";
import { apiClient } from "@/lib/api-client";

// Create a separate component for the PDF button to ensure client-side only rendering

interface DietFormActionsProps {
  onAddOgun: () => void;
  onGeneratePDF: (formattedDietData: any) => void;
  dietData: any;
  diet: Diet;
  clientId?: number;
  /**
   * Persist the diet to the database. Returns success + the new/updated diet
   * id so the caller can chain follow-up actions (PDF, WhatsApp deep link).
   * Accepts an options bag — when `skipRedirect` is true the form stays put
   * (used by "Kaydet ve PDF İndir" so the PDF download isn't interrupted).
   */
  onSaveToDatabase: (
    options?: { skipRedirect?: boolean }
  ) => Promise<{ ok: boolean; dietId?: number; clientId?: number }>;
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
  const [isSavingAndExporting, setIsSavingAndExporting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);
  const pdfButtonRef = useRef<DirectPDFButtonHandle>(null);
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
      // The parent's handleSaveToDB already surfaces its own success/error
      // toasts, so don't duplicate them here.
      await onSaveToDatabase();
    } catch (error) {
      console.error("Veritabanına kaydetme hatası:", error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Atomic flow on a single click: persist the diet (with the server-side
   * "same client + same day = override" guard), produce the PDF the
   * dietitian will hand the client, and finally hop into WhatsApp with a
   * pre-filled greeting so they can attach the PDF and send.
   *
   * The popup blocker trap: browsers only allow `window.open` from a fresh
   * user gesture. After `await`s the gesture is gone. So we pre-open a
   * blank window synchronously here, then either navigate it to the
   * WhatsApp URL on success or close it on failure / when there is no
   * phone number to message.
   */
  const handleSaveAndDownloadPdf = async () => {
    if (!clientId) {
      toast({
        title: "Uyarı",
        description: "Danışan seçilmeden kayıt yapılamaz.",
        variant: "destructive",
      });
      return;
    }
    if (isSavingAndExporting) return;
    setIsSavingAndExporting(true);

    let whatsappWindow: Window | null = null;
    if (validPhoneNumber && typeof window !== "undefined") {
      // Preserve the user gesture so popup blockers stay quiet.
      whatsappWindow = window.open("about:blank", "_blank");
    }

    try {
      const saveResult = await onSaveToDatabase({ skipRedirect: true });
      if (!saveResult.ok) {
        // onSaveToDatabase already surfaced the error toast.
        whatsappWindow?.close();
        return;
      }

      const handle = pdfButtonRef.current;
      if (!handle) {
        toast({
          title: "PDF üretilemedi",
          description:
            "Diyet kaydedildi ancak PDF bileşeni hazır değil. Sayfayı yenileyip tekrar deneyin.",
          variant: "destructive",
        });
        whatsappWindow?.close();
        return;
      }
      await handle.generate();

      // WhatsApp step is best-effort: never let it bury the fact that the
      // save and PDF already succeeded.
      const dietIdForWhatsapp = saveResult.dietId ?? diet?.id;
      const clientIdForWhatsapp = saveResult.clientId ?? clientId;

      if (!validPhoneNumber) {
        toast({
          title: "Telefon numarası yok",
          description:
            "Diyet kaydedildi ve PDF indirildi. WhatsApp adımı için danışana telefon numarası ekleyin.",
        });
        whatsappWindow?.close();
        return;
      }

      if (!dietIdForWhatsapp) {
        whatsappWindow?.close();
        return;
      }

      try {
        const wa = await apiClient.post<{ whatsappURL?: string; error?: string }>(
          "/whatsapp/send-diet",
          { clientId: clientIdForWhatsapp, dietId: dietIdForWhatsapp }
        );
        if (wa?.whatsappURL) {
          if (whatsappWindow && !whatsappWindow.closed) {
            whatsappWindow.location.href = wa.whatsappURL;
          } else {
            // Pre-open failed (blocked or never created) — try a direct open.
            window.open(wa.whatsappURL, "_blank");
          }
          toast({
            title: "WhatsApp açıldı",
            description:
              "Mesaj hazır. İndirilen PDF'i ekleyip 'Gönder'e basın.",
          });
        } else {
          whatsappWindow?.close();
          toast({
            title: "WhatsApp açılamadı",
            description:
              wa?.error ||
              "WhatsApp bağlantısı oluşturulamadı. Diyet ve PDF kaydedildi.",
            variant: "destructive",
          });
        }
      } catch (waError: any) {
        whatsappWindow?.close();
        toast({
          title: "WhatsApp adımı atlandı",
          description:
            waError?.message ||
            "WhatsApp bağlantısı oluşturulamadı. Diyet ve PDF kaydedildi.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Kaydet ve PDF indir hatası:", error);
      whatsappWindow?.close();
      toast({
        title: "Hata",
        description:
          error?.message || "İşlem sırasında beklenmeyen bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAndExporting(false);
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

      {/*
        Primary action: persist the diet first, then immediately produce the
        PDF the dietitian hands to the client. Solves "PDF given but diet
        record disappeared" by making the two steps atomic on the same click.
      */}
      <Button
        type="button"
        variant="default"
        onClick={handleSaveAndDownloadPdf}
        disabled={isSavingAndExporting || isSaving || !clientId}
        className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white border-none"
        title={
          validPhoneNumber
            ? "Diyeti kaydeder, PDF indirir ve WhatsApp'ı önceden doldurulmuş mesajla açar."
            : "Diyeti kaydeder ve PDF indirir. WhatsApp adımı için danışana telefon numarası eklenmesi gerekir."
        }
      >
        {isSavingAndExporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Kaydediliyor, PDF hazırlanıyor…
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            {isUpdateMode
              ? validPhoneNumber
                ? "Güncelle, PDF İndir ve WhatsApp'tan Gönder"
                : "Güncelle ve PDF İndir"
              : validPhoneNumber
              ? "Kaydet, PDF İndir ve WhatsApp'tan Gönder"
              : "Kaydet ve PDF İndir"}
          </>
        )}
      </Button>

      {/*
        Hidden PDF button — kept mounted so we can call its imperative
        `generate()` from the combined action above without rendering a
        second visible trigger that could be clicked out of order.
      */}
      <DirectPDFButton
        ref={pdfButtonRef}
        hidden
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
        phoneNumber={validPhoneNumber}
        dietId={diet?.id}
        importantDateId={diet?.importantDateId}
        onError={(error) => {
          toast({
            title: "Hata",
            description: error || "PDF oluşturulurken bir hata oluştu",
            variant: "destructive",
          });
        }}
      />

      <Button
        type="button"
        variant="outline"
        onClick={handleSaveToDatabase}
        disabled={isSaving || isSavingAndExporting || !clientId}
        className="border-green-600 text-green-700 hover:bg-green-50"
        title="Diyeti kaydeder ancak PDF üretmez (taslak/güncelleme için)"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Kaydediliyor...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {isUpdateMode ? "Sadece Güncelle" : "Sadece Kaydet"}
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
