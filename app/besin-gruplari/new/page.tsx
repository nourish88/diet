"use client";
import { useRouter } from "next/navigation";
import BesinGroupForm from "@/components/BesinGroupForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewBesinGroupPage() {
  const router = useRouter();

  const handleSuccess = (groupId: number) => {
    router.push(`/besin-gruplari`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/besin-gruplari"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Besin Grupları Listesine Dön
        </Link>
      </div>

      <BesinGroupForm onSuccess={handleSuccess} />
    </div>
  );
} 