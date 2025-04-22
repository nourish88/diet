"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface DietItem {
  id: number;
  miktar: number;
  besin: {
    id: number;
    name: string;
  };
  birim: {
    id: number;
    name: string;
  };
}

interface Ogun {
  id: number;
  name: string;
  items: DietItem[];
}

interface Diet {
  id: number;
  createdAt: string;
  updatedAt: string;
  tarih: string;
  client?: {
    id: number;
    name: string;
    surname: string;
  };
  oguns: Ogun[];
  Su?: string;
  Fizik?: string;
  Hedef?: string;
  Sonuc?: string;
  dietitianNote?: string;
}

export default function DietDetailPage() {
  const [diet, setDiet] = useState<Diet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();

  const dietId = params?.id ? Number(params.id) : null;

  useEffect(() => {
    if (!dietId || isNaN(dietId)) {
      toast({
        title: "Hata",
        description: "Geçersiz beslenme programı ID'si",
        variant: "destructive",
      });
      router.push("/diets");
      return;
    }

    fetchDiet();
  }, [dietId]);

  const fetchDiet = async () => {
    if (!dietId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/diets/${dietId}`);
      const data = await response.json();

      if (!response.ok || !data.diet) {
        throw new Error(data.error || "Diyet bulunamadı");
      }

      setDiet(data.diet);
    } catch (error) {
      console.error("Error fetching diet:", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Diyet bilgileri yüklenirken bir hata oluştu",
        variant: "destructive",
      });
      router.push("/diets");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!diet) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">
          {diet.client ? `${diet.client.name} ${diet.client.surname}` : 'İsimsiz'} - Beslenme Programı
        </h1>
        
        <div className="mb-6">
          <p className="text-gray-600">
            Tarih: {format(new Date(diet.tarih), 'dd MMMM yyyy', { locale: tr })}
          </p>
        </div>

        {diet.oguns.map((ogun) => (
          <div key={ogun.id} className="mb-6">
            <h2 className="text-xl font-semibold mb-3">{ogun.name}</h2>
            <div className="space-y-2">
              {ogun.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <span>{item.miktar}</span>
                  <span>{item.birim.name}</span>
                  <span>{item.besin.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {diet.Su && (
          <div className="mt-4">
            <h3 className="font-semibold">Su Tüketimi</h3>
            <p>{diet.Su}</p>
          </div>
        )}

        {diet.Fizik && (
          <div className="mt-4">
            <h3 className="font-semibold">Fiziksel Aktivite</h3>
            <p>{diet.Fizik}</p>
          </div>
        )}

        {diet.Hedef && (
          <div className="mt-4">
            <h3 className="font-semibold">Hedef</h3>
            <p>{diet.Hedef}</p>
          </div>
        )}

        {diet.Sonuc && (
          <div className="mt-4">
            <h3 className="font-semibold">Sonuç</h3>
            <p>{diet.Sonuc}</p>
          </div>
        )}

        {diet.dietitianNote && (
          <div className="mt-4">
            <h3 className="font-semibold">Diyetisyen Notu</h3>
            <p>{diet.dietitianNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
