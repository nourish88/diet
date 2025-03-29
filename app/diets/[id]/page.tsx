"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Loader2,
  Printer,
  Download,
  Trash2,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import DirectPDFButton from "@/components/DirectPDFButton";

// Placeholder for the diet detail view
// This would be replaced with the actual DietView component that shows the diet plan
const DietDetailPlaceholder = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
);

// Helper function to format dates in Turkish format (like "24 Mart 2025")
const formatDateTR = (dateString: string | null | undefined | Date) => {
  if (!dateString) return "Tarih Belirtilmemiş";

  try {
    // Try to parse the date string based on its type
    const date =
      typeof dateString === "string"
        ? new Date(dateString)
        : dateString instanceof Date
        ? dateString
        : new Date();

    return format(date, "d MMMM yyyy", { locale: tr });
  } catch (error) {
    console.error("Date parsing error:", error);
    return "Geçersiz Tarih";
  }
};

export default function DietDetailPage() {
  const [diet, setDiet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast, toasts, dismiss } = useToast();
  const params = useParams();
  const router = useRouter();

  const dietId = Number(params.id);

  useEffect(() => {
    if (!dietId || isNaN(dietId)) {
      toast({
        title: "Hata",
        description: "Geçersiz beslenme programı ID'si",
        variant: "destructive",
      });
      router.push("/diets");
      return;
    }

    fetchDiet();
  }, [dietId]);

  const fetchDiet = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/diets/${dietId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch diet");
      }
      const data = await response.json();
      setDiet(data.diet);
    } catch (error) {
      console.error("Error fetching diet:", error);
      toast({
        title: "Hata",
        description: "Beslenme programı yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDiet = async () => {
    if (!confirm("Bu beslenme programını silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const response = await fetch(`/api/diets/${dietId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete diet");
      }

      toast({
        title: "Başarılı",
        description: "Beslenme programı başarıyla silindi",
        variant: "default",
      });

      // Redirect to diets list or client detail
      if (diet && diet.clientId) {
        router.push(`/clients/${diet.clientId}`);
      } else {
        router.push("/diets");
      }
    } catch (error) {
      console.error("Error deleting diet:", error);
      toast({
        title: "Hata",
        description: "Beslenme programı silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Tarih Belirtilmemiş";
    try {
      return format(new Date(dateString), "PPP", { locale: tr });
    } catch (error) {
      return "Geçersiz Tarih";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">
            Beslenme programı yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  if (!diet) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-gray-900">
            Beslenme programı bulunamadı
          </h3>
          <p className="mt-2 text-gray-500">
            Aradığınız beslenme programı mevcut değil veya silinmiş olabilir.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => router.push("/diets")}
              className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
            >
              Tüm Programlara Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Link
          href="/diets"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Tüm Beslenme Programlarına Dön
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-medium">
              Beslenme Programı #{diet.id}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Oluşturulma: {formatDate(diet.createdAt)}
            </p>
          </div>
          <div className="flex space-x-2">
            <DirectPDFButton
              diet={diet}
              pdfData={{
                fullName: diet.client
                  ? `${diet.client.name} ${diet.client.surname}`.trim()
                  : "İsimsiz Danışan",
                dietDate: diet.tarih
                  ? formatDateTR(diet.tarih)
                  : "Tarih Belirtilmemiş",
                weeklyResult: diet.sonuc || diet.Sonuc || "",
                target: diet.hedef || diet.Hedef || "",
                ogunler: (diet.oguns || diet.Oguns || []).map((ogun: any) => ({
                  name: ogun.name || "",
                  time: ogun.time || "",
                  menuItems: (ogun.items || [])
                    .filter((item: any) => item.besin?.name || item.besin)
                    .map((item: any) =>
                      `${item.miktar || ""} ${
                        item.birim?.name || item.birim || ""
                      } ${item.besin?.name || item.besin || ""}`.trim()
                    ),
                  notes: ogun.detail || "",
                })),
                waterConsumption: diet.su || diet.Su || "",
                physicalActivity: diet.fizik || diet.Fizik || "",
              }}
              variant="outline"
              className="bg-white text-indigo-700 hover:bg-indigo-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </DirectPDFButton>
            <Button
              variant="outline"
              className="bg-white text-red-600 hover:bg-red-50"
              onClick={handleDeleteDiet}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Diet info section */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2 mb-4">
                Program Bilgileri
              </h3>

              <div className="space-y-4">
                <div>
                  <span className="block text-sm font-medium text-gray-500">
                    Müşteri
                  </span>
                  <Link
                    href={`/clients/${diet.clientId}`}
                    className="mt-1 text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <User className="h-4 w-4 mr-1" />
                    {diet.client?.name} {diet.client?.surname}
                  </Link>
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-500">
                    Program Tarihi
                  </span>
                  <span className="mt-1">{formatDate(diet.tarih)}</span>
                </div>

                {diet.Su && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500">
                      Su Tüketimi
                    </span>
                    <span className="mt-1">{diet.Su}</span>
                  </div>
                )}

                {diet.Fizik && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500">
                      Fiziksel Aktivite
                    </span>
                    <span className="mt-1">{diet.Fizik}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2 mb-4">
                Hedef ve Sonuç
              </h3>

              <div className="space-y-4">
                {diet.Hedef && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500">
                      Hedef
                    </span>
                    <span className="mt-1">{diet.Hedef}</span>
                  </div>
                )}

                {diet.Sonuc && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500">
                      Sonuç
                    </span>
                    <span className="mt-1">{diet.Sonuc}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Diet content section */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 border-b pb-2 mb-4">
              Beslenme Programı İçeriği
            </h3>

            {/* Check for both possible property names */}
            {(diet.oguns && diet.oguns.length > 0) ||
            (diet.Oguns && diet.Oguns.length > 0) ? (
              <div className="space-y-6">
                {/* Use the property that exists */}
                {(diet.oguns || diet.Oguns).map((ogun: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-800">
                        {ogun.name || `Öğün ${index + 1}`}
                      </h4>
                      {ogun.time && (
                        <span className="text-sm text-gray-500">
                          Saat: {ogun.time}
                        </span>
                      )}
                    </div>

                    {ogun.items && ogun.items.length > 0 ? (
                      <div className="mb-3">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Besin
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Miktar
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Birim
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {ogun.items.map((item: any, itemIndex: number) => (
                              <tr key={itemIndex}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {item.besin?.name || item.besin}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {item.miktar}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {item.birim?.name || item.birim}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">
                        Bu öğün için besin öğesi eklenmemiş.
                      </p>
                    )}

                    {ogun.detail && (
                      <div className="mt-3 text-sm">
                        <span className="font-medium text-gray-700">Not: </span>
                        <span className="text-gray-600">{ogun.detail}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Bu beslenme programında öğün bulunmuyor.
              </p>
            )}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
