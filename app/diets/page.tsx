"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import {
  Loader2,
  PlusCircle,
  Search,
  ClipboardList,
  Users,
  Calendar,
  X,
  Eye,
  Download,
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
  viewCount?: number;
  downloadCount?: number;
  client: {
    id: number;
    name: string;
    surname: string;
  };
}

const ITEMS_PER_PAGE = 20;

export default function DietsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['diets', debouncedSearchTerm],
    queryFn: ({ pageParam = 0 }) => {
      const queryParams = new URLSearchParams();
      queryParams.append("skip", pageParam.toString());
      queryParams.append("take", ITEMS_PER_PAGE.toString());
      if (debouncedSearchTerm) {
        queryParams.append("search", debouncedSearchTerm);
      }
      const url = `/diets?${queryParams.toString()}`;
      return apiClient.get<{ diets: Diet[]; total: number; hasMore: boolean }>(url);
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length * ITEMS_PER_PAGE : undefined;
    },
    initialPageParam: 0,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Flatten pages to single array
  const diets = data?.pages.flatMap((page) => page.diets) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const hasMore = hasNextPage ?? false;

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isFetchingNextPage &&
          !isLoading
        ) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isFetchingNextPage, isLoading, fetchNextPage]);

  // Handle error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-16">
          <p className="text-destructive mb-4">
            Beslenme programları yüklenirken bir hata oluştu: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
          </p>
          <Button onClick={() => refetch()}>Tekrar Dene</Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Tarih Belirtilmemiş";
    try {
      return format(new Date(dateString), "PPP", { locale: tr });
    } catch (error) {
      return "Geçersiz Tarih";
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Tarih Belirtilmemiş";
    try {
      return format(new Date(dateString), "d MMM yyyy HH:mm", { locale: tr });
    } catch (error) {
      return "Geçersiz Tarih";
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Beslenme Programları
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Danışanlarınız için oluşturduğunuz programlar
          </p>
        </div>
        <Button
          onClick={() => router.push("/diets/new")}
          className="bg-brand-gradient hover:opacity-90 text-white w-full sm:w-auto"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Yeni Program Ekle
        </Button>
      </div>

      {/* Search box */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground/70" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2 border border-border rounded-md leading-5 bg-card placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
              <X className="h-5 w-5 text-muted-foreground/70 hover:text-muted-foreground" />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-xs text-muted-foreground mt-1">
            "{searchTerm}" için {total} sonuç bulundu
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
          <span className="ml-2 text-muted-foreground">
            Beslenme programları yükleniyor...
          </span>
        </div>
      ) : diets.length === 0 ? (
        searchTerm ? (
          <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed border-border">
            <Search className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Arama sonucu bulunamadı
            </h3>
            <p className="text-muted-foreground mb-4">
              "{searchTerm}" ile eşleşen beslenme programı veya danışan
              bulunamadı
            </p>
            <Button
              onClick={clearSearch}
              variant="outline"
              className="border-indigo-600 text-brand hover:bg-brand-soft"
            >
              Aramayı Temizle
            </Button>
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed border-border">
            <ClipboardList className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Henüz beslenme programı bulunmuyor
            </h3>
            <p className="text-muted-foreground mb-4">
              İlk beslenme programınızı oluşturun
            </p>
            <Button
              onClick={() => router.push("/diets/new")}
              className="bg-brand-gradient hover:opacity-90 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Yeni Program Ekle
            </Button>
          </div>
        )
      ) : (
        <div className="bg-card rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
          <div className="bg-brand-gradient px-6 py-4 text-white">
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
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Danışan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Program Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Oluşturulma Tarihi
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Görüntülenme
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    İndirme
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {diets.map((diet) => (
                  <tr
                    key={diet.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        #{diet.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-indigo-500 mr-2" />
                        <div className="text-sm font-medium text-foreground">
                          <Link
                            href={`/clients/${diet.client.id}`}
                            className="text-brand hover:text-indigo-900"
                          >
                            {diet.client.name} {diet.client.surname}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1 text-muted-foreground/70" />
                        {formatDate(diet.tarih)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(diet.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4 text-muted-foreground/70" />
                        {diet.viewCount ?? 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Download className="h-4 w-4 text-muted-foreground/70" />
                        {diet.downloadCount ?? 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/diets/${diet.id}`}
                          className="text-brand hover:text-indigo-900 bg-brand-soft px-3 py-1 rounded-md transition-colors"
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
          {isFetchingNextPage && (
            <div className="flex justify-center items-center py-4 border-t">
              <Loader2 className="h-6 w-6 text-brand animate-spin" />
              <span className="ml-2 text-muted-foreground">
                Daha fazla yükleniyor...
              </span>
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && diets.length > 0 && (
            <div className="text-center py-4 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground">
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
