"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useClientActions from "@/hooks/useClientActions";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  Pencil,
  CalendarRange,
  ClipboardList,
  PlusCircle,
  Phone,
  FileText,
  User,
  ChevronLeft,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale/tr";

// Update the Client interface to match the actual data structure
interface Client {
  id: number;
  name: string;
  surname: string;
  birthdate: string | null;
  phoneNumber?: string | null;
  notes?: string | null;
  illness?: string | null;
  gender?: number | null;
  createdAt: string;
  updatedAt: string;
  diets: Array<{
    id: number;
    createdAt: string;
    tarih?: string | null;
  }>;
  bannedFoods: Array<{
    id: number;
    besin: {
      id: number;
      name: string;
    };
    reason?: string;
  }>;
}

export default function ClientDetailPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getClient } = useClientActions();
  const { toast, toasts, dismiss } = useToast(); // Destructure all needed properties
  const params = useParams();
  const router = useRouter();

  const clientId = Number(params.id);

  useEffect(() => {
    if (!clientId || isNaN(clientId)) {
      toast({
        title: "Hata",
        description: "Geçersiz müşteri ID'si",
        variant: "destructive",
      });
      router.push("/clients");
      return;
    }

    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    setIsLoading(true);
    try {
      // Make sure the API endpoint includes diets in the response
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();
      console.log(data, "data");
      if (!data.client) {
        toast({
          title: "Hata",
          description: "Danışan bulunamadı",
          variant: "destructive",
        });
        router.push("/clients");
        return;
      }

      // Log the received data to debug
      console.log("Received client data:", data.client);

      // If diets are not included in the API response, fetch them separately
      if (!data.client.diets || !Array.isArray(data.client.diets)) {
        // Fetch diets for this client
        try {
          const dietsResponse = await fetch(`/api/clients/${clientId}/diets`);
          const dietsData = await dietsResponse.json();
          
          // Combine the client data with the diets data
          const clientWithDiets = {
            ...data.client,
            diets: dietsData.diets || []
          };
          
          console.log("Client with diets:", clientWithDiets);
          setClient(clientWithDiets);
        } catch (dietsError) {
          console.error("Error fetching client diets:", dietsError);
          // Still set the client data even if diets fetch fails
          setClient(data.client);
        }
      } else {
        // Diets are already included in the client data
        setClient(data.client);
      }
    } catch (error) {
      console.error("Error fetching client:", error);
      toast({
        title: "Hata",
        description: "Danışan bilgileri yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the formatDate function to properly handle the date format
  const formatDate = (dateString: string | null | undefined) => {
    console.log("Formatting date:", dateString); // Debug log
    if (!dateString) return "Belirtilmemiş";

    try {
      // First parse the ISO string to a Date object
      const date = parseISO(dateString);
      console.log("Parsed date:", date); // Debug log

      if (isNaN(date.getTime())) {
        console.log("Invalid date after parsing"); // Debug log
        return "Belirtilmemiş";
      }

      const formatted = format(date, "d MMMM yyyy", { locale: tr });
      console.log("Formatted date:", formatted); // Debug log
      return formatted;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Belirtilmemiş";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-indigo-300 rounded-full mb-4"></div>
            <div className="h-4 w-40 bg-indigo-300 rounded mb-3"></div>
            <div className="h-3 w-32 bg-indigo-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Danışan Listesine Dön
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-medium">
              {client.name} {client.surname}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Danışan #{client.id} | Kayıt: {formatDate(client.createdAt)}
            </p>
          </div>
          <Button
            onClick={() => router.push(`/clients/${client.id}/edit`)}
            variant="outline"
            className="bg-white text-indigo-700 hover:bg-indigo-50"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client basic information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                Kişisel Bilgiler
              </h3>

              <div className="flex items-start">
                <CalendarRange className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Doğum Tarihi
                  </div>
                  <div className="text-gray-800">
                    {formatDate(client.birthdate)}
                  </div>
                </div>
              </div>

              {/* Add Illness Information */}
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Hastalık
                  </div>
                  <div className="text-gray-800">
                    {client.illness || "Belirtilmemiş"}
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Telefon
                  </div>
                  <div className="text-gray-800">
                    {client.phoneNumber || "Belirtilmemiş"}
                  </div>
                </div>
              </div>

              {/* Add Gender */}
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-indigo-500 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-700">Cinsiyet</h4>
                  <p className="text-gray-600">
                    {client.gender === 1
                      ? "Erkek"
                      : client.gender === 2
                      ? "Kadın"
                      : "Belirtilmemiş"}
                  </p>
                </div>
              </div>
            </div>

            {/* Client notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                Notlar
              </h3>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-gray-800 whitespace-pre-wrap">
                  {client.notes || "Herhangi bir not bulunmuyor."}
                </div>
              </div>
            </div>

            {/* Add Banned Foods section */}
            <div className="col-span-full mt-4">
              <h4 className="font-medium text-gray-700 mb-3">
                Yasaklı Besinler
              </h4>
              {client.bannedFoods && client.bannedFoods.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {client.bannedFoods.map((banned) => (
                    <div
                      key={banned.besin.id}
                      className="p-3 bg-red-50 border border-red-100 rounded-lg"
                    >
                      <p className="font-medium text-red-700">
                        {banned.besin.name}
                      </p>
                      {banned.reason && (
                        <p className="text-sm text-red-600 mt-1">
                          Sebep: {banned.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Yasaklı besin bulunmamaktadır</p>
              )}
            </div>
          </div>

          {/* Client diet history */}
          <div className="mt-8">
            <div className="border-b border-gray-200 pb-2 mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                <ClipboardList className="h-5 w-5 text-indigo-500 mr-2" />
                Beslenme Programları
              </h3>
              <Button
                onClick={() => router.push(`/diets/new?clientId=${client.id}`)}
                className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
                size="sm"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Yeni Program Ekle
              </Button>
            </div>

            {client.diets && client.diets.length > 0 ? (
              <div className="space-y-3">
                {client.diets.map((diet) => (
                  <div
                    key={diet.id}
                    className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/diets/${diet.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          Beslenme Programı #{diet.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          Oluşturulma: {formatDate(diet.createdAt)}
                        </div>
                      </div>
                      {diet.tarih && (
                        <div className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                          Program Tarihi: {formatDate(diet.tarih)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Henüz diyet bulunmuyor.
              </p>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
