import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Button } from "./ui/button";
import { Diet } from "@/types/types";
import { apiClient } from "@/lib/api-client";
import {
  Check,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createDietReport } from "./diet/pdf/dietReport";
import { ensurePdfMake } from "@/lib/pdfmake";
import { requireClientName } from "@/lib/client-name";
import { reportClientError } from "@/lib/application-error-client";
import { loadDietPdfAssets } from "@/components/diet/pdf/pdfAssets";
import {
  buildDietPdfFileName,
  DietPdfData,
  prepareDirectPdfData,
} from "@/components/diet/pdf/pdfData";

export interface DirectPDFButtonHandle {
  /**
   * Trigger PDF generation programmatically. Useful when another button
   * (e.g. "Kaydet ve PDF İndir") needs to invoke the same pdfmake pipeline
   * without rendering a duplicate trigger button.
   */
  generate: () => Promise<boolean>;
  /** Whether a generation is currently in flight. */
  isGenerating: () => boolean;
}

interface DirectPDFButtonProps {
  diet?: Diet;
  pdfData?: DietPdfData;
  phoneNumber?: string;
  isDietSaved?: boolean;
  dietId?: number;
  importantDateId?: number | null;
  disabled?: boolean;
  onError?: (error: string) => void;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  /**
   * Optional async callback that runs BEFORE PDF generation. If it returns
   * `false`, generation is aborted. Used to save the diet first so the PDF
   * never leaves the office without a matching DB record.
   */
  beforeGenerate?: () => Promise<boolean | void> | boolean | void;
  /** Override the button label (default: "PDF İndir"). */
  label?: string;
  /** Hide the rendered button — caller uses the ref to trigger instead. */
  hidden?: boolean;
  onClick?: () => void;
}

const DirectPDFButton = forwardRef<DirectPDFButtonHandle, DirectPDFButtonProps>(function DirectPDFButton({
  diet,
  pdfData,
  phoneNumber,
  className,
  isDietSaved = false,
  dietId,
  importantDateId,
  disabled,
  onError,
  variant = "ghost",
  size = "sm",
  beforeGenerate,
  label,
  hidden = false,
  onClick,
  ...props
}, ref) {
  const [isLoading, setIsLoading] = useState(false);
  const [importantDateMessage, setImportantDateMessage] = useState<string>("");


  useEffect(() => {
    const fetchImportantDate = async () => {
      console.log("Starting fetchImportantDate with:", {
        importantDateId,
        isImportantDateCelebrated: pdfData?.isImportantDateCelebrated,
      });
      if (!importantDateId || !pdfData?.isImportantDateCelebrated) {
        console.log("Skipping fetch - missing required data");
        return;
      }
      try {
        const data = await apiClient.get<{ message?: string }>(`/important-dates/${importantDateId}`);
        console.log("Fetched important date data:", data);
        if (data.message) {
          setImportantDateMessage(data.message);
        }
      } catch (error) {
        console.error("Error fetching important date:", error);
      }
    };
    // Immediately invoke the fetch when conditions are met
    if (importantDateId && pdfData?.isImportantDateCelebrated) {
      fetchImportantDate();
    }
  }, [importantDateId, pdfData?.isImportantDateCelebrated]); // Dependencies

  const handleSuccess = () => {
    toast({
      title: "PDF Başarıyla Oluşturuldu",
      description: "Beslenme programınız indiriliyor...",
      variant: "default",
      duration: 3000,
      action: (
        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-4 w-4 text-success" />
        </div>
      ),
    });
  };

  const generatePDF = async () => {
    if (isLoading) return false;
    setIsLoading(true);
    try {
      if (beforeGenerate) {
        const shouldContinue = await beforeGenerate();
        if (shouldContinue === false) {
          return false;
        }
      }
      const pdfMake = await ensurePdfMake();
      const pdfDataToUse = prepareDirectPdfData(
        diet,
        pdfData,
        importantDateMessage
      );
      if (!pdfDataToUse) throw new Error("Beslenme programı verisi bulunamadı");

      requireClientName(pdfDataToUse.fullName);
      const assets = await loadDietPdfAssets();

      const docDefinition = createDietReport(pdfDataToUse, assets);
      const fileName = buildDietPdfFileName(pdfDataToUse);
      pdfMake.createPdf(docDefinition).download(fileName);
      const trackId = dietId ?? diet?.id;
      if (trackId) {
        apiClient
          .post(`/diets/${trackId}/track`, { event: "download" })
          .catch((err) => console.warn("Diet download tracking failed", err));
      }
      handleSuccess();
      return true;
    } catch (error) {
      reportClientError(error, { code: "pdf_failed" });
      console.error("PDF oluşturma hatası:", error);
      toast({
        title: "Hata",
        description: `PDF oluşturulamadı: ${(error as Error).message}`,
        variant: "destructive",
        duration: 5000,
        action: (
          <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-4 w-4 text-destructive" />
          </div>
        ),
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    generate: generatePDF,
    isGenerating: () => isLoading,
  }), [isLoading, generatePDF]);

  if (hidden) return null;

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
      onClick={generatePDF}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {label ?? "PDF İndir"}
    </Button>
  );
});

DirectPDFButton.displayName = "DirectPDFButton";

export default DirectPDFButton;
