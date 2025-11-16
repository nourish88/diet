"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  List,
  PlusCircle,
  Pencil,
  Trash2,
  Coffee,
} from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api-client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

interface BesinGroup {
  id: number;
  description: string;
  createdAt: string;
  _count?: {
    besins: number;
  };
}

export default function BesinGruplariPage() {
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const { toast, toasts, dismiss } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Use React Query for data fetching
  const {
    data: groups = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BesinGroup[]>({
    queryKey: ["besin-gruplari"],
    queryFn: async () => {
      return apiClient.get<BesinGroup[]>("/besin-gruplari");
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use mutation for delete operation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/besin-gruplari/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["besin-gruplari"] });
      toast({
        title: "Başarılı",
        description: "Besin grubu başarıyla silindi.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting besin group:", error);
      toast({
        title: "Hata",
        description: "Besin grubu silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteGroup = async (id: number) => {
    if (confirm("Bu besin grubunu silmek istediğinize emin misiniz?")) {
      setIsDeleting(id);
      try {
        await deleteMutation.mutateAsync(id);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Besin Grupları</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/besinler")}
            variant="outline"
            className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
          >
            <Coffee className="h-4 w-4 mr-2" />
            Besinler
          </Button>
          <Button
            onClick={() => router.push("/besin-gruplari/new")}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Yeni Grup Ekle
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="text-center py-16 bg-red-50 rounded-lg border-2 border-red-200">
          <p className="text-red-600 mb-4">
            Besin grupları yüklenirken bir hata oluştu.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Tekrar Dene
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">
            Besin grupları yükleniyor...
          </span>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Henüz besin grubu bulunmuyor
          </h3>
          <p className="text-gray-500 mb-4">
            İlk besin grubunu ekleyerek başlayın
          </p>
          <Button
            onClick={() => router.push("/besin-gruplari/new")}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Yeni Grup Ekle
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
            <h2 className="text-lg font-medium">Tüm Besin Grupları</h2>
            <p className="text-sm text-blue-100 mt-1">
              Toplam {groups.length} grup
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grup Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Besin Sayısı
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
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <List className="h-4 w-4 text-indigo-500 mr-2" />
                        <div className="text-sm font-medium text-gray-900">
                          {group.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {group._count?.besins || 0} besin
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(group.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() =>
                            router.push(`/besin-gruplari/${group.id}/edit`)
                          }
                          size="sm"
                          variant="outline"
                          className="h-8 text-blue-600 hover:text-blue-900 bg-blue-50 border-blue-200"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Düzenle
                        </Button>
                        <Button
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={isDeleting === group.id}
                          size="sm"
                          variant="outline"
                          className="h-8 text-red-600 hover:text-red-900 bg-red-50 border-red-200"
                        >
                          {isDeleting === group.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
}
