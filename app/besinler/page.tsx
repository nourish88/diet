"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Coffee,
  PlusCircle,
  Pencil,
  Trash2,
  List,
} from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";

interface BesinGroup {
  id: number;
  description: string;
}

interface Besin {
  id: number;
  name: string;
  priority: number;
  groupId: number | null;
  group: BesinGroup | null;
  createdAt: string;
}

export default function BesinlerPage() {
  const [besinler, setBesinler] = useState<Besin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const { toast, toasts, dismiss } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchBesinler();
  }, []);

  const fetchBesinler = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/besinler");
      if (!response.ok) {
        throw new Error("Besinler yüklenirken bir hata oluştu");
      }
      const data = await response.json();
      setBesinler(data);
    } catch (error) {
      console.error("Error fetching besinler:", error);
      toast({
        title: "Hata",
        description: "Besinler yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBesin = async (id: number) => {
    if (confirm("Bu besini silmek istediğinize emin misiniz?")) {
      setIsDeleting(id);
      try {
        const response = await fetch(`/api/besinler/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Besin silinirken bir hata oluştu");
        }

        toast({
          title: "Başarılı",
          description: "Besin başarıyla silindi.",
          variant: "default",
        });

        fetchBesinler();
      } catch (error) {
        console.error("Error deleting besin:", error);
        toast({
          title: "Hata",
          description: "Besin silinirken bir hata oluştu.",
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
        <h1 className="text-2xl font-bold text-gray-800">Besin Yönetimi</h1>
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
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">Besinler yükleniyor...</span>
        </div>
      ) : besinler.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Henüz besin bulunmuyor
          </h3>
          <p className="text-gray-500 mb-4">İlk besini ekleyerek başlayın</p>
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
            <h2 className="text-lg font-medium">Tüm Besinler</h2>
            <p className="text-sm text-blue-100 mt-1">
              Toplam {besinler.length} besin
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
                        {besin.priority}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {besin.group ? (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {besin.group.description}
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
                          size="sm"
                          variant="outline"
                          className="h-8 text-blue-600 hover:text-blue-900 bg-blue-50 border-blue-200"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Düzenle
                        </Button>
                        <Button
                          onClick={() => handleDeleteBesin(besin.id)}
                          disabled={isDeleting === besin.id}
                          size="sm"
                          variant="outline"
                          className="h-8 text-red-600 hover:text-red-900 bg-red-50 border-red-200"
                        >
                          {isDeleting === besin.id ? (
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
