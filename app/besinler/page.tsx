"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Coffee,
  Loader2,
  PlusCircle,
  Trash2,
  List,
  Search,
  RefreshCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface BesinGroup {
  id: number;
  description: string;
  name: string;
}

interface Besin {
  id: number;
  name: string;
  priority: number | null;
  groupId: number | null;
  besinGroup: BesinGroup | null;
}

interface BesinApiResponse {
  items: Besin[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  nextPage: number | null;
}

const PAGE_SIZE = 25;

export default function BesinlerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchBesinler = async ({
    pageParam = 1,
  }: {
    pageParam?: number;
  }): Promise<BesinApiResponse> => {
    const params = new URLSearchParams({
      page: pageParam.toString(),
      pageSize: PAGE_SIZE.toString(),
    });
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    }

    const response = await fetch(`/api/besinler?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      let message = "Besinler yüklenirken bir hata oluştu.";
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          message = errorData.error;
        }
      } catch (error) {
        // JSON parse hatasını önemseme
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.items)) {
      throw new Error("Beklenmeyen cevap formatı alındı.");
    }
    return data;
  };

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery<
    BesinApiResponse,
    Error,
    InfiniteData<BesinApiResponse, number>,
    [string, string, number],
    number
  >({
    queryKey: ["besinler", debouncedSearch, PAGE_SIZE],
    queryFn: ({ pageParam = 1 }) => fetchBesinler({ pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });

  const besinler = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );
  const total = data?.pages?.[0]?.total ?? 0;
  const isInitialLoading = isLoading && !data;
  const isEmpty = !isInitialLoading && besinler.length === 0 && !isError;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    const sentinel = loadMoreRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDeleteBesin = async (id: number) => {
    if (!confirm("Bu besini silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const response = await fetch(`/api/besinler/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let message = "Besin silinirken bir hata oluştu.";
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            message = errorData.error;
          }
        } catch (error) {
          // JSON parse hatasını önemseme
        }
        throw new Error(message);
      }

      toast({
        title: "Başarılı",
        description: "Besin başarıyla silindi.",
      });

      await queryClient.invalidateQueries({ queryKey: ["besinler"] });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Besin silinirken bir hata oluştu.";
      toast({
        title: "Hata",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleManualRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["besinler"] });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Besin Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplam {total} besin • Gösterilen {besinler.length}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Besin ara..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push("/besin-gruplari")}
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              <List className="h-4 w-4 mr-2" />
              Besin Grupları
            </Button>
            <Button
              onClick={() => router.push("/besinler/new")}
              className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Yeni Besin Ekle
            </Button>
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Yenile
            </Button>
          </div>
        </div>
      </div>

      {isInitialLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">Besinler yükleniyor...</span>
        </div>
      ) : isError ? (
        <div className="text-center py-16 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-medium text-red-700 mb-2">
            Bir hata meydana geldi
          </h3>
          <p className="text-red-600 mb-4">
            {error instanceof Error
              ? error.message
              : "Lütfen daha sonra tekrar deneyin."}
          </p>
          <Button onClick={handleManualRefresh}>Tekrar Dene</Button>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Sonuç bulunamadı
          </h3>
          <p className="text-gray-500 mb-4">
            Farklı bir arama deneyebilir veya yeni bir besin ekleyebilirsiniz.
          </p>
          <Button
            onClick={() => router.push("/besinler/new")}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Yeni Besin Ekle
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
            <h2 className="text-lg font-medium">
              Besinler {debouncedSearch ? `• "${debouncedSearch}"` : ""}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {isFetching && !isFetchingNextPage
                ? "Güncelleniyor..."
                : `Toplam ${total} kayıt`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Besin Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öncelik
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grup
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {besinler.map((besin) => (
                  <tr
                    key={besin.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Coffee className="h-4 w-4 text-indigo-500 mr-2" />
                        <div className="text-sm font-medium text-gray-900">
                          {besin.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {besin.priority ?? "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {besin.besinGroup ? (
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-800"
                        >
                          {besin.besinGroup.name}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">Grup yok</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() =>
                            router.push(`/besinler/${besin.id}/edit`)
                          }
                          variant="outline"
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                          Düzenle
                        </Button>
                        <Button
                          onClick={() => handleDeleteBesin(besin.id)}
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            ref={loadMoreRef}
            className="border-t border-purple-100 bg-purple-50 p-4 text-center"
          >
            {hasNextPage ? (
              <div className="flex justify-center items-center gap-2 text-purple-700">
                <Loader2
                  className={`h-4 w-4 ${
                    isFetchingNextPage ? "animate-spin" : "hidden"
                  }`}
                />
                <span>
                  {isFetchingNextPage
                    ? "Yeni kayıtlar yükleniyor..."
                    : "Daha fazla kayıt yüklemek için aşağı kaydırmaya devam edin"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-purple-700">
                Tüm kayıtlar görüntülendi.
              </span>
            )}
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
