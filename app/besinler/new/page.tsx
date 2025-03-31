"use client";
import { useRouter } from "next/navigation";
import BesinForm from "@/components/BesinForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewBesinPage() {
  const router = useRouter();

  const handleSuccess = (besinId: number) => {
    router.push(`/besinler`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/besinler"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Besin Listesine Dön
        </Link>
      </div>

      <BesinForm onSuccess={handleSuccess} />
    </div>
  );
}
