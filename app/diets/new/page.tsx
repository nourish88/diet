"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const DietForm = dynamic(() => import("@/components/DietForm"), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <span className="ml-2 text-gray-600">Form yükleniyor...</span>
    </div>
  ),
});

function DietPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams?.get("clientId");
  const templateId = searchParams?.get("templateId");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        {clientId ? (
          <Link
            href={`/clients/${clientId}`}
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Danışan Detaylarına Dön
          </Link>
        ) : (
          <Link
            href="/clients"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Danışan Listesine Dön
          </Link>
        )}
      </div>

      <DietForm
        initialClientId={clientId ? parseInt(clientId, 10) : undefined}
        initialTemplateId={templateId ? parseInt(templateId, 10) : undefined}
      />
    </div>
  );
}

export default function NewDietPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DietPageContent />
    </Suspense>
  );
}
