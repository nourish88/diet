"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Loader2,
  Printer,
  Download,
  Trash2,
  Clock,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import DirectPDFButton from "@/components/DirectPDFButton";
import { createClient } from "@/lib/supabase-browser";

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
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const dietId = params?.id ? Number(params.id) : null;

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
      // Get authentication token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast({
          title: "Hata",
          description: "Lütfen giriş yapın",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/diets/${dietId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch diet");
      }
      const data = await response.json();
      // Normalize field casing so UI consistently renders
      const normalizedDiet = {
        ...data.diet,
        Hedef: data.diet?.Hedef ?? data.diet?.hedef ?? "",
        Sonuc: data.diet?.Sonuc ?? data.diet?.sonuc ?? "",
        Su: data.diet?.Su ?? data.diet?.su ?? "",
        Fizik: data.diet?.Fizik ?? data.diet?.fizik ?? "",
        Oguns: data.diet?.Oguns ?? data.diet?.oguns ?? [],
      };
      setDiet(normalizedDiet);
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
      // Get authentication token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast({
          title: "Hata",
          description: "Lütfen giriş yapın",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/diets/${dietId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

  const handleSendViaWhatsApp = async () => {
    if (!diet?.client?.id || !dietId) return;

    try {
      // Get authentication token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast({
          title: "Hata",
          description: "Lütfen giriş yapın",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      const response = await fetch("/api/whatsapp/send-diet", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: diet.client.id,
          dietId: dietId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Open WhatsApp with the generated URL
        window.open(data.whatsappURL, "_blank");

        toast({
          title: "Başarılı",
          description:
            "WhatsApp açıldı! Mesajı göndermek için 'Gönder' butonuna basın.",
        });
      } else {
        toast({
          title: "Hata",
          description: data.error || "WhatsApp URL oluşturulamadı",
          variant: "destructive",
        });
      }
    } catch (error) {
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
                dietDate: diet.tarih || diet.createdAt || new Date().toISOString(),
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
              variant="ghost"
              className="text-white hover:bg-indigo-700"
            />
            <Button
              variant="ghost"
              className="text-white hover:bg-indigo-700"
              onClick={handleSendViaWhatsApp}
              disabled={!diet.client?.phoneNumber}
            >
              📱 WhatsApp
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
                  href={`/clients/${diet.clientId}`}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {diet.client.name} {diet.client.surname}
                </Link>
                <p className="text-sm text-gray-600">
                  Diyet Tarihi: {formatDate(diet.tarih)}
                </p>
              </div>
            </div>
          )}

          {(diet.hedef || diet.sonuc || diet.su || diet.fizik || diet.Hedef || diet.Sonuc || diet.Su || diet.Fizik) && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Program Detayları</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(diet.hedef || diet.Hedef) && (
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <p className="font-medium text-gray-700">Hedef</p>
                    <p className="text-gray-600">{diet.hedef || diet.Hedef}</p>
                  </div>
                )}
                {(diet.sonuc || diet.Sonuc) && (
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="font-medium text-gray-700">Sonuç</p>
                    <p className="text-gray-600">{diet.sonuc || diet.Sonuc}</p>
                  </div>
                )}
                {(diet.su || diet.Su) && (
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="font-medium text-gray-700">Su Tüketimi</p>
                    <p className="text-gray-600">{diet.su || diet.Su}</p>
                  </div>
                )}
                {(diet.fizik || diet.Fizik) && (
                  <div className="border-l-4 border-purple-500 pl-4">
                    <p className="font-medium text-gray-700">
                      Fiziksel Aktivite
                    </p>
                    <p className="text-gray-600">{diet.fizik || diet.Fizik}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4">Öğünler</h3>
            {(diet.oguns && diet.oguns.length > 0) ||
            (diet.Oguns && diet.Oguns.length > 0) ? (
              <div className="space-y-4">
                {(diet.oguns || diet.Oguns).map((ogun: any, index: number) => (
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
                              {item.besin?.name || item.besin} - {item.miktar}{" "}
                              {item.birim?.name || item.birim}
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
                          <span className="font-medium">Not:</span> {ogun.detail}
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
