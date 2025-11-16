"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

const ClientForm = dynamic(() => import("@/components/ClientForm"), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <span className="ml-2 text-gray-600">Form yükleniyor...</span>
    </div>
  ),
});

export default function EditClientPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const router = useRouter();

  const clientId = params?.id ? Number(params.id) : null;

  // Define expected client shape for this page
  interface EditClientData {
    id: number;
    name: string;
    surname: string;
    birthdate?: string | null;
    phoneNumber?: string | null;
    notes?: string | null;
    gender?: string | number | null;
    illness?: string | null;
    bannedFoods?: Array<{
      besin: { id: number; name: string };
      reason?: string | null;
    }>;
  }

  // Use React Query for data fetching
  const {
    data: client,
    isLoading,
    isError,
    error,
  } = useQuery<EditClientData>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId || isNaN(clientId)) {
        throw new Error("Geçersiz danışan ID'si");
      }
      try {
        const clientData = await apiClient.get<EditClientData>(`/clients/${clientId}`);
        if (!clientData) {
          throw new Error("Danışan bulunamadı");
        }
        return clientData;
      } catch (error: any) {
        if (error?.status === 404) {
          throw new Error("Danışan bulunamadı");
        }
        throw new Error("Danışan bilgileri yüklenirken bir hata oluştu");
      }
    },
    enabled: !!clientId && !isNaN(clientId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle error redirects
  if (isError && error instanceof Error) {
    if (error.message === "Geçersiz danışan ID'si" || error.message === "Danışan bulunamadı") {
      router.push("/clients");
    }
  }

  const handleSuccess = () => {
    if (clientId) {
      // Invalidate client-related caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
    router.push(`/clients/${clientId}`);
  };

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Bir şeyler yolunda gitmedi
          </h2>
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : "Danışan bilgileri yüklenirken bir hata oluştu"}
          </p>
          <button
            onClick={() => router.push("/clients")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Danışan Listesine Dön
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">
            Danışan bilgileri yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  if (!client) return null;

  // Transform bannedFoods to bannedBesins format for the form
  const bannedBesins =
    client.bannedFoods?.map((banned: any) => ({
      besinId: banned.besin.id,
      reason: banned.reason,
    })) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/clients/${clientId}`}
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Danışan Detaylarına Dön
        </Link>
      </div>

      <ClientForm
        initialData={{
          id: client.id,
          name: client.name,
          surname: client.surname,
          birthdate: client.birthdate,
          phoneNumber: client.phoneNumber,
          notes: client.notes,
          gender: client.gender?.toString() || null, // Convert gender to string
          illness: client.illness,
          bannedBesins: bannedBesins,
        }}
        onSuccess={handleSuccess}
        isEdit={true}
      />
      <Toaster />
    </div>
  );
}
