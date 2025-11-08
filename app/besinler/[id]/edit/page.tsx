"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader2, RefreshCcw } from "lucide-react";

import BesinForm from "@/components/BesinForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface BesinResponse {
  id: number;
  name: string;
  priority: number | null;
  groupId: number | null;
}

export default function EditBesinPage() {
  const router = useRouter();
  const params = useParams();
  const besinId = params?.id ? Number(params.id) : undefined;

  const [initialData, setInitialData] = useState<BesinResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!besinId || Number.isNaN(besinId)) {
      setErrorMessage("Geçersiz besin numarası.");
      setIsLoading(false);
      return;
    }

    const fetchBesin = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/besinler/${besinId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 404) {
            setErrorMessage("Aradığınız besin bulunamadı.");
          } else {
            setErrorMessage("Besin bilgileri yüklenirken bir hata oluştu.");
          }
          return;
        }

        const data = await response.json();
        setInitialData({
          id: data.id,
          name: data.name ?? "",
          priority:
            typeof data.priority === "number" ? data.priority : data.priority ?? 0,
          groupId: data.groupId ?? null,
        });
        setErrorMessage(null);
      } catch (error) {
        console.error("Error fetching besin:", error);
        setErrorMessage("Besin bilgileri yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBesin();
  }, [besinId]);

  const handleRefresh = async () => {
    if (!besinId) return;
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/besinler/${besinId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error();
      }
      const data = await response.json();
      setInitialData({
        id: data.id,
        name: data.name ?? "",
        priority:
          typeof data.priority === "number" ? data.priority : data.priority ?? 0,
        groupId: data.groupId ?? null,
      });
      setErrorMessage(null);
      toast({
        title: "Yenilendi",
        description: "Besin bilgileri güncellendi.",
      });
    } catch (error) {
      console.error("Error refreshing besin:", error);
      toast({
        title: "Hata",
        description: "Besin bilgileri yenilenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSuccess = () => {
    toast({
      title: "Başarılı",
      description: "Besin bilgileri güncellendi.",
    });
    router.push("/besinler");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/besinler"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Besin Listesine Dön
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading || !!errorMessage}
          className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Yenileniyor
            </>
          ) : (
            <>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Yenile
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-3 text-gray-600">Besin bilgileri yükleniyor...</span>
        </div>
      ) : errorMessage ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Bir şeyler yolunda gitmedi
          </h2>
          <p className="text-red-600 mb-4">{errorMessage}</p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/besinler")}
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              Listeye Dön
            </Button>
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Tekrar Dene
            </Button>
          </div>
        </div>
      ) : initialData ? (
        <BesinForm
          initialData={{
            id: initialData.id,
            name: initialData.name,
            priority: initialData.priority ?? 0,
            groupId: initialData.groupId,
          }}
          onSuccess={handleSuccess}
          isEdit
        />
      ) : null}

      <Toaster />
    </div>
  );
}

