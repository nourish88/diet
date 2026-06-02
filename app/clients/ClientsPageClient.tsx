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
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";

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

export default function ClientsPageClient() {
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const clientsQueryKey = debouncedSearchTerm
    ? qk.clients.list({ search: debouncedSearchTerm })
    : qk.clients.list();

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
    queryKey: clientsQueryKey,
    queryFn: ({ pageParam = 0 }) =>
      fetchClients({
        skip: pageParam,
        take: ITEMS_PER_PAGE,
        search: debouncedSearchTerm || undefined,
      }),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length * ITEMS_PER_PAGE : undefined;
    },
    initialPageParam: 0,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Flatten pages to single array
  const clients = data?.pages.flatMap((page) => page.clients) ?? [];
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

      // Invalidate and refetch clients
      queryClient.invalidateQueries({ queryKey: qk.clients.root });
      refetch();
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

  // Handle error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-16">
          <p className="text-destructive mb-4">
            Danışanlar yüklenirken bir hata oluştu: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
          </p>
          <Button onClick={() => refetch()}>Tekrar Dene</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Danışan Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Tüm danışanlarınızı görüntüleyin ve yönetin
          </p>
        </div>
        <Button
          onClick={() => router.push("/clients/new")}
          className="bg-brand-gradient hover:opacity-90 text-white w-full sm:w-auto"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Danışan Ekle
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
          <span className="ml-2 text-muted-foreground">Danışanlar yükleniyor...</span>
        </div>
      ) : clients.length === 0 ? (
        searchTerm ? (
          <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed border-border">
            <Search className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Arama sonucu bulunamadı
            </h3>
            <p className="text-muted-foreground mb-4">
              "{searchTerm}" ile eşleşen danışan bulunamadı
            </p>
            <Button
              onClick={() => setSearchTerm("")}
              variant="outline"
              className="border-indigo-600 text-brand hover:bg-brand-soft"
            >
              Aramayı Temizle
            </Button>
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed border-border">
            <h3 className="text-lg font-medium text-foreground mb-2">
              Henüz danışan bulunmuyor
            </h3>
            <p className="text-muted-foreground mb-4">
              İlk danışanınızı ekleyerek başlayın
            </p>
            <Button
              onClick={() => router.push("/clients/new")}
              className="bg-brand-gradient hover:opacity-90 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Yeni Danışan Ekle
            </Button>
          </div>
        )
      ) : (
        <div className="bg-card rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
          <div className="bg-brand-gradient px-6 py-4 text-white">
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
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    İsim Soyisim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cinsiyet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Doğum Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        {client.name} {client.surname}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {client.gender === 1 ? "Erkek" : "Kadın"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {client.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
                          className="text-brand hover:text-indigo-900 bg-brand-soft p-2 rounded-md transition-colors"
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
                          className="text-destructive hover:text-red-900 bg-destructive/10 p-2 rounded-md transition-colors disabled:opacity-50"
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
          {isFetchingNextPage && (
            <div className="flex justify-center items-center py-4 border-t">
              <Loader2 className="h-6 w-6 text-brand animate-spin" />
              <span className="ml-2 text-muted-foreground">
                Daha fazla yükleniyor...
              </span>
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && clients.length > 0 && (
            <div className="text-center py-4 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Tüm danışanlar yüklendi ({total} toplam)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
