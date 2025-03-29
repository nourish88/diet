"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useClientActions from "@/hooks/useClientActions";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Pencil, Trash2, Phone } from "lucide-react";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

interface Client {
  id: number;
  name: string;
  surname: string;
  birthdate?: string | null;
  phoneNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const { getClients, deleteClient, isLoading } = useClientActions();
  const { toast, toasts, dismiss } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const clientsData = await getClients();
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Hata",
        description: "Müşteriler yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) {
      setIsDeleting(id);
      try {
        const success = await deleteClient(id);
        if (success) {
          toast({
            title: "Başarılı",
            description: "Müşteri başarıyla silindi.",
            variant: "default",
          });
          fetchClients();
        }
      } catch (error) {
        console.error("Error deleting client:", error);
        toast({
          title: "Hata",
          description: "Müşteri silinirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Müşteri Yönetimi</h1>
        <Button
          onClick={() => router.push("/clients/new")}
          className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Müşteri Ekle
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">Müşteriler yükleniyor...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Henüz müşteri bulunmuyor
          </h3>
          <p className="text-gray-500 mb-4">
            İlk müşterinizi ekleyerek başlayın
          </p>
          <Button
            onClick={() => router.push("/clients/new")}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Yeni Müşteri Ekle
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
            <h2 className="text-lg font-medium">Tüm Müşteriler</h2>
            <p className="text-sm text-blue-100 mt-1">
              Toplam {clients.length} müşteri
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İsim Soyisim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kayıt Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {client.name} {client.surname}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.phoneNumber ? (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="h-4 w-4 mr-1 text-green-500" />
                          {client.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Telefon yok
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(client.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-md transition-colors"
                        >
                          <span className="sr-only">Görüntüle</span>
                          Detay
                        </Link>
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-md transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Düzenle</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          disabled={isDeleting === client.id}
                          className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-md transition-colors disabled:opacity-50"
                        >
                          {isDeleting === client.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Sil</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
