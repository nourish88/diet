import { useState } from "react";
import { Button, ButtonProps } from "./ui/button";
import { FileText, Loader2 } from "lucide-react";
import { createDietReport } from "./diet/pdf/dietReport";
import { ensurePdfMake } from "@/lib/pdfmake";
import { requireClientName } from "@/lib/client-name";
import { reportClientError } from "@/lib/application-error-client";
import { loadDietPdfAssets } from "@/components/diet/pdf/pdfAssets";
import { apiClient } from "@/lib/api-client";
import {
  buildDietPdfFileName,
  prepareDatabasePdfData,
} from "@/components/diet/pdf/pdfData";
interface DatabasePDFButtonProps extends ButtonProps {
  diet: any;
  trackEndpoint?: string;
}

const DatabasePDFButton = ({
  diet,
  className,
  trackEndpoint,
  ...props
}: DatabasePDFButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      const pdfMake = await ensurePdfMake();

      const pdfData = prepareDatabasePdfData(diet);
      if (!pdfData) throw new Error("Beslenme programı verisi bulunamadı");

      requireClientName(pdfData.fullName);
      const assets = await loadDietPdfAssets();

      const docDefinition = createDietReport(pdfData, assets);
      const fileName = buildDietPdfFileName(pdfData);
      pdfMake.createPdf(docDefinition).download(fileName);
      const endpoint = trackEndpoint ?? (diet?.id ? `/diets/${diet.id}/track` : null);
      if (endpoint) {
        apiClient
          .post(endpoint, { event: "download" })
          .catch((err) => console.warn("Diet download tracking failed", err));
      }
    } catch (error) {
      reportClientError(error, { code: "pdf_failed" });
      console.error("PDF oluşturma hatası:", error);
      alert(`PDF oluşturulamadı: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-2 ${className}`}
      onClick={generatePDF}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      PDF İndir
    </Button>
  );
};

export default DatabasePDFButton;
