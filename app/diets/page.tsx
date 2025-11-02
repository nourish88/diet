"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import { Toaster } from "@/components/ui/toaster";

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

const ITEMS_PER_PAGE = 20;

export default function DietsPage() {
  const [diets, setDiets] = useState<Diet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
    queryKey: ['diets-list-first-page'],
    queryFn: async () => {
      console.log("🔄 FETCHING first page of diets from API");
      const queryParams = new URLSearchParams();
      queryParams.append("skip", "0");
      queryParams.append("take", ITEMS_PER_PAGE.toString());
      const url = `/diets?${queryParams.toString()}`;
      return apiClient.get(url);
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Fetch diets with pagination
  const loadDiets = useCallback(
    async (pageNum: number, search: string, append: boolean = false) => {
      try {
        // Use cached first page if available (page 0, no search)
        if (pageNum === 0 && !search && cachedFirstPage && !append) {
          console.log("💾 USING CACHED first page of diets");
          setDiets(cachedFirstPage.diets);
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
        const queryParams = new URLSearchParams();
        queryParams.append("skip", skip.toString());
        queryParams.append("take", ITEMS_PER_PAGE.toString());
        if (search) {
          queryParams.append("search", search);
        }

        const url = `/diets?${queryParams.toString()}`;
        console.log("🔄 DietsPage: Fetching diets from:", url);
        const data = await apiClient.get(url);
        console.log("📋 DietsPage: Received data:", data);

        if (append) {
          setDiets((prev) => [...prev, ...data.diets]);
        } else {
          setDiets(data.diets);
        }

        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (error) {
        console.error("❌ DietsPage: Error fetching diets:", error);
        toast({
          title: "Hata",
          description: "Beslenme programları yüklenirken bir hata oluştu.",
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
    loadDiets(0, searchTerm, false);
    setPage(0);
  }, []);

  // Search effect - reset and load from beginning
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      loadDiets(0, searchTerm, false);
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchTerm, loadDiets]);

  // Load more when scrolling
  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadDiets(nextPage, searchTerm, true);
    }
  }, [page, searchTerm, hasMore, isLoading, isLoadingMore, loadDiets]);

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
      {/* Logo - Show for client role */}
      <div className="flex justify-center mb-6">
        <img
          src="/ezgi_evgin-removebg-preview.png"
          alt="Ezgi Evgin Beslenme ve Diyet Danışmanlığı"
          className="max-w-[150px] h-auto"
          style={{ width: "150px", height: "auto" }}
        />
      </div>
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
            "{searchTerm}" için {total} sonuç bulundu
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
      ) : diets.length === 0 ? (
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
                ? `"${searchTerm}" için ${total} sonuç (${diets.length} yüklendi)`
                : `Toplam ${total} program (${diets.length} yüklendi)`}
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
                {diets.map((diet) => (
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
          {!hasMore && diets.length > 0 && (
            <div className="text-center py-4 border-t bg-gray-50">
              <p className="text-sm text-gray-500">
                Tüm beslenme programları yüklendi ({total} toplam)
              </p>
            </div>
          )}
        </div>
      )}
      <Toaster />
    </div>
  );
}
