"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import {
  Loader2,
  PlusCircle,
  Search,
  ClipboardList,
  Users,
  Calendar,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";

// Simplified Diet type for the listing
interface Diet {
  id: number;
  createdAt: string;
  tarih: string | null;
  clientId: number;
  client: {
    id: number;
    name: string;
    surname: string;
  };
}

export default function DietsPage() {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [filteredDiets, setFilteredDiets] = useState<Diet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast, toasts, dismiss } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchDiets();
  }, []);

  useEffect(() => {
    // Filter diets when the search term or diets list changes
    if (searchTerm.trim() === "") {
      setFilteredDiets(diets);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = diets.filter((diet) => {
        const clientFullName =
          `${diet.client.name} ${diet.client.surname}`.toLowerCase();
        const dietId = diet.id.toString();

        return (
          clientFullName.includes(lowerSearch) ||
          dietId.includes(lowerSearch) ||
          (diet.tarih &&
            new Date(diet.tarih)
              .toLocaleDateString("tr-TR")
              .includes(lowerSearch))
        );
      });

      setFilteredDiets(filtered);
    }
  }, [searchTerm, diets]);

  const fetchDiets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/diets/all");
      if (!response.ok) {
        throw new Error("Failed to fetch diets");
      }
      const data = await response.json();
      const dietsData = data.diets || [];
      setDiets(dietsData);
      setFilteredDiets(dietsData);
    } catch (error) {
      console.error("Error fetching diets:", error);
      toast({
        title: "Hata",
        description: "Beslenme programları yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Beslenme Programları
        </h1>
        <Button
          onClick={() => router.push("/diets/new")}
          className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Yeni Program Ekle
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
            placeholder="Danışan adı, ID veya tarih ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label="Clear search"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-gray-500 mt-1">
            "{searchTerm}" için {filteredDiets.length} sonuç bulundu
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">
            Beslenme programları yükleniyor...
          </span>
        </div>
      ) : filteredDiets.length === 0 ? (
        searchTerm ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Arama sonucu bulunamadı
            </h3>
            <p className="text-gray-500 mb-4">
              "{searchTerm}" ile eşleşen beslenme programı veya danışan
              bulunamadı
            </p>
            <Button
              onClick={clearSearch}
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              Aramayı Temizle
            </Button>
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Henüz beslenme programı bulunmuyor
            </h3>
            <p className="text-gray-500 mb-4">
              İlk beslenme programınızı oluşturun
            </p>
            <Button
              onClick={() => router.push("/diets/new")}
              className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Yeni Program Ekle
            </Button>
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
            <h2 className="text-lg font-medium">
              {searchTerm ? "Arama Sonuçları" : "Tüm Beslenme Programları"}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {searchTerm
                ? `"${searchTerm}" için ${filteredDiets.length} sonuç`
                : `Toplam ${filteredDiets.length} program`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Danışan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDiets.map((diet) => (
                  <tr
                    key={diet.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{diet.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-indigo-500 mr-2" />
                        <div className="text-sm font-medium text-gray-900">
                          <Link
                            href={`/clients/${diet.client.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {diet.client.name} {diet.client.surname}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(diet.tarih)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(diet.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/diets/${diet.id}`}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                        >
                          Görüntüle
                        </Link>
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
