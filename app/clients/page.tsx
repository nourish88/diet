"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Pencil, Trash2, Search, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { fetchClients } from "@/services/ClientService";
import { apiClient } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Client {
  id: number;
  name: string;
  surname: string;
  birthdate: string | Date | null;
  phoneNumber?: string | null;
  gender?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  illness?: string | null;
  notes?: string | null;
}

const ITEMS_PER_PAGE = 20;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Cache first page load with React Query
  const { data: cachedFirstPage } = useQuery({
    queryKey: ['clients-list-first-page'],
    queryFn: async () => {
      console.log("🔄 FETCHING first page of clients from API");
      return fetchClients({
        skip: 0,
        take: ITEMS_PER_PAGE,
        search: undefined,
      });
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Fetch clients with pagination
  const loadClients = useCallback(
    async (pageNum: number, search: string, append: boolean = false) => {
      try {
        // Use cached first page if available (page 0, no search)
        if (pageNum === 0 && !search && cachedFirstPage && !append) {
          console.log("💾 USING CACHED first page of clients");
          setClients(cachedFirstPage.clients);
          setHasMore(cachedFirstPage.hasMore);
          setTotal(cachedFirstPage.total);
          setIsLoading(false);
          return;
        }

        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        const skip = pageNum * ITEMS_PER_PAGE;
        const response = await fetchClients({
          skip,
          take: ITEMS_PER_PAGE,
          search: search || undefined,
        });

        if (append) {
          setClients((prev) => [...prev, ...response.clients]);
        } else {
          setClients(response.clients);
        }

        setHasMore(response.hasMore);
        setTotal(response.total);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast({
          title: "Hata",
          description: "Danışanlar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [toast, cachedFirstPage]
  );

  // Initial load
  useEffect(() => {
    loadClients(0, searchTerm, false);
    setPage(0);
  }, []);

  // Search effect - reset and load from beginning
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      loadClients(0, searchTerm, false);
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchTerm, loadClients]);

  // Load more when scrolling
  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadClients(nextPage, searchTerm, true);
    }
  }, [page, searchTerm, hasMore, isLoading, isLoadingMore, loadClients]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingMore
        ) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  const handleDeleteClient = async (id: number) => {
    if (!confirm("Bu danışanı silmek istediğinize emin misiniz?")) {
      return;
    }

    setIsDeleting(id);
    try {
      await apiClient.delete(`/clients/${id}`);

      toast({
        title: "Başarılı",
        description: "Danışan başarıyla silindi",
        variant: "default",
      });

      // Reload clients from the beginning
      setPage(0);
      loadClients(0, searchTerm, false);
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
            "{searchTerm}" için {total} sonuç bulundu
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">Danışanlar yükleniyor...</span>
        </div>
      ) : clients.length === 0 ? (
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
                ? `"${searchTerm}" için ${total} sonuç (${clients.length} yüklendi)`
                : `Toplam ${total} danışan (${clients.length} yüklendi)`}
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
                {clients.map((client) => (
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
                      {client.birthdate
                        ? format(new Date(client.birthdate), "dd MMMM yyyy", {
                            locale: tr,
                          })
                        : "-"}
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

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-10" />

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center items-center py-4 border-t">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
              <span className="ml-2 text-gray-600">
                Daha fazla yükleniyor...
              </span>
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && clients.length > 0 && (
            <div className="text-center py-4 border-t bg-gray-50">
              <p className="text-sm text-gray-500">
                Tüm danışanlar yüklendi ({total} toplam)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
