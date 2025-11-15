"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, Trash2, Clock, User, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import DirectPDFButton from "@/components/DirectPDFButton";
import { useDiet, useDeleteDiet } from "@/hooks/useApi";
import { apiClient } from "@/lib/api-client";
import { useEffect } from "react";

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
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();

  const dietId = params?.id ? Number(params.id) : undefined;

  // Use React Query hook for data fetching with automatic caching
  // Set staleTime to 0 to always fetch fresh data (cache can cause phoneNumber to be missing)
  const { data: diet, isLoading, error, refetch } = useDiet(dietId, {
    staleTime: 0, // Always fetch fresh data
  });
  const deleteDietMutation = useDeleteDiet();

  // Debug: Log diet data to check phoneNumber
  useEffect(() => {
    if (diet) {
      console.log("Diet data:", diet);
      console.log("Client data:", diet.client);
      console.log("Phone number:", diet.client?.phoneNumber);
    }
  }, [diet]);

  const handleDeleteDiet = async () => {
    if (!confirm("Bu beslenme programını silmek istediğinize emin misiniz?")) {
      return;
    }

    if (!dietId) return;

    try {
      await deleteDietMutation.mutateAsync(dietId);

      toast({
        title: "Başarılı",
        description: "Beslenme programı başarıyla silindi",
        variant: "default",
      });

      // Redirect to diets list or client detail
      if (diet && diet.client?.id) {
        router.push(`/clients/${diet.client.id}`);
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

  const handleSendViaWhatsApp = async () => {
    console.log("🔵 handleSendViaWhatsApp called");
    console.log("🔵 diet:", diet);
    console.log("🔵 diet?.client:", diet?.client);
    console.log("🔵 diet?.client?.id:", diet?.client?.id);
    console.log("🔵 dietId:", dietId);
    console.log("🔵 diet?.client?.phoneNumber:", diet?.client?.phoneNumber);

    if (!diet?.client?.id || !dietId) {
      console.log("❌ Early return - missing client.id or dietId");
      toast({
        title: "Hata",
        description: "Danışan bilgisi veya diyet ID bulunamadı",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ Proceeding with WhatsApp request...");

    try {
      console.log("📞 Sending request to /whatsapp/send-diet", {
        clientId: diet.client.id,
        dietId: dietId,
      });

      const data = await apiClient.post("/whatsapp/send-diet", {
        clientId: diet.client.id,
        dietId: dietId,
      });

      console.log("✅ WhatsApp API response:", data);

      // Open WhatsApp with the generated URL
      if (data?.whatsappURL) {
        console.log("🔗 Opening WhatsApp URL:", data.whatsappURL);
        window.open(data.whatsappURL, "_blank");
      } else {
        console.error("❌ No whatsappURL in response:", data);
      }

      toast({
        title: "Başarılı",
        description:
          "WhatsApp açıldı! Mesajı göndermek için 'Gönder' butonuna basın.",
      });
    } catch (error) {
      console.error("❌ WhatsApp error:", error);
      toast({
        title: "Hata",
        description: "WhatsApp URL oluşturulamadı",
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
              Oluşturulma: {formatDate(diet.createdAt ?? null)}
            </p>
          </div>
          <div className="flex space-x-2">
            <DirectPDFButton
              pdfData={{
                fullName: diet.client
                  ? `${diet.client.name} ${diet.client.surname}`.trim()
                  : "İsimsiz Danışan",
                dietDate:
                  diet.tarih || diet.createdAt || new Date().toISOString(),
                weeklyResult: diet.sonuc || "Sonuç belirtilmemiş",
                target: diet.hedef || "",
                ogunler: (diet.oguns || []).map((ogun: any) => ({
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
                waterConsumption: diet.su || "",
                physicalActivity: diet.fizik || "",
                dietitianNote: diet.dietitianNote || "",
                isBirthdayCelebration: (diet as any).isBirthdayCelebration || false,
                isImportantDateCelebrated: (diet as any).isImportantDateCelebrated || false,
              }}
              variant="ghost"
              className="text-white hover:bg-indigo-700"
            />
            <Button
              variant="ghost"
              className="text-white hover:bg-indigo-700"
              onClick={(e) => {
                console.log("🔵 WhatsApp button clicked");
                console.log("🔵 Event:", e);
                console.log("🔵 Button disabled?", !diet?.client || !diet.client.phoneNumber || !diet.client.phoneNumber.trim());
                handleSendViaWhatsApp();
              }}
              disabled={!diet?.client || !diet.client.phoneNumber || !diet.client.phoneNumber.trim()}
            >
              📱 WhatsApp
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-blue-600"
              onClick={() => router.push(`/diets/new?updateDietId=${dietId}`)}
            >
              Güncelle
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-red-600"
              onClick={handleDeleteDiet}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {diet.client && (
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Danışan Bilgileri
              </h3>
              <div className="border-l-4 border-indigo-500 pl-4">
                <Link
                  href={`/clients/${diet.client?.id}`}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {diet.client?.name} {diet.client?.surname}
                </Link>
                <p className="text-sm text-gray-600">
                  Diyet Tarihi: {formatDate(diet.tarih)}
                </p>
              </div>
            </div>
          )}

          {(diet.hedef || diet.sonuc || diet.su || diet.fizik) && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Program Detayları</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diet.hedef && (
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <p className="font-medium text-gray-700">Hedef</p>
                    <p className="text-gray-600">{diet.hedef}</p>
                  </div>
                )}
                {diet.sonuc && (
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="font-medium text-gray-700">Sonuç</p>
                    <p className="text-gray-600">{diet.sonuc}</p>
                  </div>
                )}
                {diet.su && (
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="font-medium text-gray-700">Su Tüketimi</p>
                    <p className="text-gray-600">{diet.su}</p>
                  </div>
                )}
                {diet.fizik && (
                  <div className="border-l-4 border-purple-500 pl-4">
                    <p className="font-medium text-gray-700">
                      Fiziksel Aktivite
                    </p>
                    <p className="text-gray-600">{diet.fizik}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {diet.dietitianNote && (
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Diyetisyen Notu
              </h3>
              <div className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50 rounded-r">
                <p className="text-gray-700 whitespace-pre-wrap">{diet.dietitianNote}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4">Öğünler</h3>
            {diet.oguns && diet.oguns.length > 0 ? (
              <div className="space-y-4">
                {diet.oguns.map((ogun: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-800">
                        {ogun.name || `Öğün ${index + 1}`}
                      </h4>
                      {ogun.time && (
                        <span className="text-sm text-gray-600 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {ogun.time}
                        </span>
                      )}
                    </div>
                    {ogun.items && ogun.items.length > 0 ? (
                      <ul className="space-y-2">
                        {ogun.items.map((item: any, itemIndex: number) => (
                          <li
                            key={itemIndex}
                            className="text-gray-700 flex items-start"
                          >
                            <span className="mr-2">•</span>
                            <span>
                              {typeof item.besin === "object" && item.besin
                                ? item.besin.name
                                : item.besin || ""}{" "}
                              - {item.miktar || ""}{" "}
                              {typeof item.birim === "object" && item.birim
                                ? item.birim.name
                                : item.birim || ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 italic">
                        Bu öğün için besin eklenmemiş
                      </p>
                    )}
                    {ogun.detail && (
                      <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Not:</span>{" "}
                          {ogun.detail}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Bu beslenme programında öğün bulunmuyor
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
