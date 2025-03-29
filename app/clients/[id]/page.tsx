"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useClientActions from "@/hooks/useClientActions";
import useDietActions from "@/hooks/useDietActions";
import { Button } from "@/components/ui/button";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft,
  Pencil,
  CalendarRange,
  Phone,
  FileText,
  ClipboardList,
  PlusCircle,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";

interface Client {
  id: number;
  name: string;
  surname: string;
  birthdate?: string | null;
  phoneNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  diets: Array<{
    id: number;
    createdAt: string;
    tarih?: string | null;
  }>;
}

export default function ClientDetailPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getClient } = useClientActions();
  const { toast, toasts, dismiss } = useToast();
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
      const clientData = await getClient(clientId);
      if (!clientData) {
        toast({
          title: "Hata",
          description: "Müşteri bulunamadı",
          variant: "destructive",
        });
        router.push("/clients");
        return;
      }
      setClient(clientData);
    } catch (error) {
      console.error("Error fetching client:", error);
      toast({
        title: "Hata",
        description: "Müşteri bilgileri yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP", { locale: tr });
    } catch (error) {
      return "Geçersiz Tarih";
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
          Müşteri Listesine Dön
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-medium">
              {client.name} {client.surname}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Müşteri #{client.id} | Kayıt: {formatDate(client.createdAt)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                    {client.birthdate
                      ? formatDate(client.birthdate)
                      : "Belirtilmemiş"}
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
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <ClipboardList className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  Henüz beslenme programı bulunmuyor
                </h3>
                <p className="text-gray-500 mb-4">
                  Bu müşteri için bir beslenme programı oluşturun
                </p>
                <Button
                  onClick={() =>
                    router.push(`/diets/new?clientId=${client.id}`)
                  }
                  className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Yeni Program Ekle
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
