"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DietForm from "@/components/DietForm";
import { ChevronLeft } from "lucide-react";

export default function NewDietPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        {clientId ? (
          <Link
            href={`/clients/${clientId}`}
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Müşteri Detaylarına Dön
          </Link>
        ) : (
          <Link
            href="/clients"
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Müşteri Listesine Dön
          </Link>
        )}
      </div>

      <DietForm
        initialClientId={clientId ? parseInt(clientId, 10) : undefined}
      />
    </div>
  );
}
