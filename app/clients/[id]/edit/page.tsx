"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ClientForm from "@/components/ClientForm";
import useClientActions from "@/hooks/useClientActions";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2 } from "lucide-react";

export default function EditClientPage() {
  const [client, setClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getClient } = useClientActions();
  const { toast, toasts, dismiss } = useToast();
  const params = useParams();
  const router = useRouter();

  const clientId = Number(params.id);

  useEffect(() => {
    if (!clientId || isNaN(clientId)) {
      toast({
        title: "Hata",
        description: "Geçersiz müşteri ID'si",
        variant: "destructive",
      });
      router.push("/clients");
      return;
    }

    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    setIsLoading(true);
    try {
      const clientData = await getClient(clientId);
      if (!clientData) {
        toast({
          title: "Hata",
          description: "Müşteri bulunamadı",
          variant: "destructive",
        });
        router.push("/clients");
        return;
      }
      setClient(clientData);
    } catch (error) {
      console.error("Error fetching client:", error);
      toast({
        title: "Hata",
        description: "Müşteri bilgileri yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    router.push(`/clients/${clientId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">
            Müşteri bilgileri yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/clients/${clientId}`}
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Müşteri Detaylarına Dön
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
        }}
        onSuccess={handleSuccess}
        isEdit={true}
      />
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
