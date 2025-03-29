"use client";
import { useRouter } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();

  const handleSuccess = (clientId: number) => {
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
          Müşteri Listesine Dön
        </Link>
      </div>

      <ClientForm onSuccess={handleSuccess} />
    </div>
  );
}
