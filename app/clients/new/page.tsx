"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const ClientForm = dynamic(() => import("@/components/ClientForm"), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <span className="ml-2 text-gray-600">Form yükleniyor...</span>
    </div>
  ),
});

export default function NewClientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSuccess = (clientId: number) => {
    // Invalidate clients list cache
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    router.push(`/clients/${clientId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Danışan Listesine Dön
        </Link>
      </div>

      <ClientForm onSuccess={handleSuccess} />
    </div>
  );
}
