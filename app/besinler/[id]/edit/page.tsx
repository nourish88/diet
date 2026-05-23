"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader2, RefreshCcw } from "lucide-react";

import BesinForm from "@/components/BesinForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

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

  const { toast } = useToast();

  // Use React Query for data fetching
  const {
    data: initialData,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery<BesinResponse>({
    queryKey: ["besin", besinId],
    queryFn: async () => {
      if (!besinId || Number.isNaN(besinId)) {
        throw new Error("Geçersiz besin numarası.");
      }

      try {
        const data = await apiClient.get<BesinResponse>(`/besinler/${besinId}`);
        return {
          id: data.id,
          name: data.name ?? "",
          priority:
            typeof data.priority === "number" ? data.priority : data.priority ?? 0,
          groupId: data.groupId ?? null,
        };
      } catch (error: any) {
        if (error?.status === 404) {
          throw new Error("Aradığınız besin bulunamadı.");
        }
        throw new Error("Besin bilgileri yüklenirken bir hata oluştu.");
      }
    },
    enabled: !!besinId && !Number.isNaN(besinId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRefresh = async () => {
    try {
      await refetch();
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
    }
  };

  // Determine error message
  const errorMessage = isError
    ? error instanceof Error
      ? error.message
      : "Besin bilgileri yüklenirken bir hata oluştu."
    : null;

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
          className="text-brand hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Besin Listesine Dön
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching || isLoading || !!errorMessage}
          className="border-indigo-600 text-brand hover:bg-brand-soft"
        >
          {isFetching ? (
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
        <div className="flex justify-center items-center h-64 rounded-lg border-2 border-dashed border-border bg-muted/30">
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
          <span className="ml-3 text-muted-foreground">Besin bilgileri yükleniyor...</span>
        </div>
      ) : errorMessage ? (
        <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Bir şeyler yolunda gitmedi
          </h2>
          <p className="text-destructive mb-4">{errorMessage}</p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/besinler")}
              className="border-indigo-600 text-brand hover:bg-brand-soft"
            >
              Listeye Dön
            </Button>
            <Button onClick={handleRefresh} disabled={isFetching}>
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

