"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useClientActions from "@/hooks/useClientActions";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Pencil, Trash2, Search, X } from "lucide-react";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";

interface Client {
  id: number;
  name: string;
  surname: string;
  birthdate: string;
  phoneNumber?: string;
  gender?: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { getClients } = useClientActions();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    // Filter clients when the search term changes
    if (searchTerm.trim() === "") {
      setFilteredClients(clients);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = clients.filter((client) => {
        const fullName = `${client.name} ${client.surname}`.toLowerCase();
        const phone = client.phoneNumber?.toLowerCase() || "";
        return fullName.includes(lowerSearch) || phone.includes(lowerSearch);
      });
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await getClients();
      console.log("API Response:", response); // Debug log

      if (Array.isArray(response)) {
        setClients(response);
        console.log("Clients set to:", response);
      } else {
        console.error("Unexpected response format:", response);
        setClients([]);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Hata",
        description: "Danışanlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm("Bu danışanı silmek istediğinize emin misiniz?")) {
      return;
    }

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete client");
      }

      toast({
        title: "Başarılı",
        description: "Danışan başarıyla silindi",
        variant: "default",
      });

      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Hata",
        description: "Danışan silinirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  console.log("Current clients state:", clients); // Debug log
  console.log("Is loading:", isLoading); // Debug log

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Danışan Yönetimi</h1>
        <Button
          onClick={() => router.push("/clients/new")}
          className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Danışan Ekle
        </Button>
      </div>

      {/* Search box */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="İsim, soyisim veya telefon ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label="Clear search"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-gray-500 mt-1">
            "{searchTerm}" için {filteredClients.length} sonuç bulundu
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">Danışanlar yükleniyor...</span>
        </div>
      ) : filteredClients.length === 0 ? (
        searchTerm ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Arama sonucu bulunamadı
            </h3>
            <p className="text-gray-500 mb-4">
              "{searchTerm}" ile eşleşen danışan bulunamadı
            </p>
            <Button
              onClick={() => setSearchTerm("")}
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              Aramayı Temizle
            </Button>
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Henüz danışan bulunmuyor
            </h3>
            <p className="text-gray-500 mb-4">
              İlk danışanınızı ekleyerek başlayın
            </p>
            <Button
              onClick={() => router.push("/clients/new")}
              className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Yeni Danışan Ekle
            </Button>
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
            <h2 className="text-lg font-medium">
              {searchTerm ? "Arama Sonuçları" : "Tüm Danışanlar"}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {searchTerm
                ? `"${searchTerm}" için ${filteredClients.length} sonuç`
                : `Toplam ${filteredClients.length} danışan`}
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
                    Cinsiyet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doğum Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {client.name} {client.surname}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     
                      {client.gender === 1 ? "Erkek" : "Kadın"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(client.birthdate), "dd MMMM yyyy", {
                        locale: tr,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-md transition-colors"
                        >
                          Detay
                        </Link>
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-md transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
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
    </div>
  );
}
