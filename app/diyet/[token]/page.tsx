"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  Download,
  Droplet,
  Loader2,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import DatabasePDFButton from "@/components/DatabasePDFButton";

type PublicDietResponse = {
  diet: any;
  dietitian?: {
    name: string | null;
    email: string;
  } | null;
};

function formatDate(date: string | null | undefined) {
  if (!date) return "Tarih belirtilmemiş";
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PublicDietPage() {
  const params = useParams();
  const token = params?.token as string;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-diet", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () => apiClient.get<PublicDietResponse>(`/public/diets/${token}`),
  });

  const diet = data?.diet;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2 text-brand" />
          Beslenme programı yükleniyor...
        </div>
      </main>
    );
  }

  if (isError || !diet) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center bg-card border border-border rounded-lg p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">
            Link bulunamadı
          </h1>
          <p className="text-muted-foreground mt-2">
            Bu beslenme programı linki geçersiz olabilir. Lütfen diyetisyeninizden
            yeni link isteyin.
          </p>
          {error instanceof Error && (
            <p className="text-xs text-muted-foreground mt-4">{error.message}</p>
          )}
        </div>
      </main>
    );
  }

  const clientName = diet.client
    ? `${diet.client.name} ${diet.client.surname}`.trim()
    : "Danışan";

  return (
    <main className="min-h-screen bg-background">
      <div className="bg-brand-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm text-white/80">Beslenme Programı</div>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">
                {clientName}
              </h1>
              <div className="flex items-center mt-2 text-white/85">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(diet.tarih || diet.createdAt)}
              </div>
            </div>
            <DatabasePDFButton
              diet={diet}
              trackEndpoint={`/public/diets/${token}/track`}
              className="bg-white text-brand hover:bg-white/90"
              variant="secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF İndir
            </DatabasePDFButton>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {diet.hedef && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4 text-amber-600" />
                Hedef
              </div>
              <p className="mt-2 text-foreground">{diet.hedef}</p>
            </div>
          )}
          {diet.su && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Droplet className="h-4 w-4 text-blue-600" />
                Su
              </div>
              <p className="mt-2 text-foreground">{diet.su}</p>
            </div>
          )}
          {diet.fizik && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="h-4 w-4 text-emerald-600" />
                Fiziksel Aktivite
              </div>
              <p className="mt-2 text-foreground">{diet.fizik}</p>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-brand" />
            <h2 className="font-semibold text-foreground">Öğünler</h2>
          </div>
          <div className="divide-y divide-border">
            {(diet.oguns || []).map((ogun: any) => (
              <div key={ogun.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h3 className="font-semibold text-foreground">{ogun.name}</h3>
                  {ogun.time && (
                    <span className="text-sm text-muted-foreground">{ogun.time}</span>
                  )}
                </div>
                <ul className="mt-3 space-y-2">
                  {(ogun.items || []).map((item: any) => (
                    <li key={item.id} className="text-sm text-foreground">
                      {`${item.miktar || ""} ${item.birim?.name || ""} ${
                        item.besin?.name || ""
                      }`.trim()}
                    </li>
                  ))}
                </ul>
                {ogun.detail && (
                  <p className="text-sm text-muted-foreground mt-3">{ogun.detail}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {diet.dietitianNote && (
          <section className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-semibold text-foreground">Diyetisyen Notu</h2>
            <p className="text-muted-foreground mt-2">{diet.dietitianNote}</p>
          </section>
        )}

        <div className="text-center text-xs text-muted-foreground pb-4">
          Bu sayfa size diyetisyeniniz tarafından güvenli paylaşım linki olarak gönderildi.
          <br />
          <Link href="/login" className="text-brand hover:underline">
            Danışan paneline giriş yap
          </Link>
        </div>
      </div>
    </main>
  );
}
