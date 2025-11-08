"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";

interface Diet {
  id: number;
  tarih: string | null;
  createdAt: string;
  hedef?: string;
  su?: string;
  isBirthdayCelebration?: boolean;
  isImportantDateCelebrated?: boolean;
  importantDate?: {
    name: string;
    message: string;
  };
  ogunCount: number;
}

export default function ClientDietsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["client-portal-overview"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        throw new Error("Session not found");
      }

      const response = await fetch("/api/client/portal/overview", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load overview");
      }

      return response.json() as Promise<{
        success: boolean;
        client: { id: number; name: string; surname: string };
        diets: Diet[];
        unreadByDiet: Record<number, number>;
      }>;
    },
  });

  const diets = data?.diets ?? [];
  const unreadCounts = data?.unreadByDiet ?? {};
  const clientName = data?.client
    ? `${data.client.name} ${data.client.surname}`
    : null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Tarih belirtilmemiş";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return "Tarihsiz";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
  };

  const getDietStatus = (diet: Diet) => {
    if (diet.isBirthdayCelebration) {
      return { icon: "🎂", text: "Doğum Günü Özel", color: "pink" };
    }
    if (diet.isImportantDateCelebrated && diet.importantDate) {
      return { icon: "🎉", text: diet.importantDate.name, color: "purple" };
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Diyetleriniz yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Beslenme Programlarım
            </h1>
            <p className="text-gray-600 mt-2">
              {clientName
                ? `${clientName} için`
                : "Kişisel beslenme programlarınız"}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetching ? "Yenileniyor..." : "Listeyi Yenile"}
          </button>
        </div>
        <p className="text-gray-600 mt-4">
          {diets.length > 0
            ? `${diets.length} beslenme programınız bulunuyor`
            : "Henüz beslenme programınız bulunmuyor"}
        </p>
      </div>

      {diets.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Henüz beslenme programınız yok
          </h3>
          <p className="text-gray-600">
            Diyetisyeniniz size bir program hazırladığında burada görünecektir
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {diets.map((diet, index) => {
            const status = getDietStatus(diet);
            const unreadCount = unreadCounts[diet.id] || 0;

            return (
              <Link
                key={diet.id}
                href={`/client/diets/${diet.id}`}
                className={`bg-white rounded-2xl shadow-lg border-2 ${
                  index === 0 ? "border-blue-500" : "border-gray-200"
                } p-6 hover:shadow-xl hover:border-blue-400 transition-all group`}
              >
                {status && (
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-4 ${
                      status.color === "pink"
                        ? "bg-pink-100 text-pink-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {status.icon} {status.text}
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-7 h-7 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Beslenme Programı #{diet.id}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          {formatDate(diet.tarih)}
                        </div>

                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1.5" />
                          {diet.ogunCount} öğün
                        </div>

                        {unreadCount > 0 && (
                          <div className="flex items-center text-red-600">
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            <span className="font-semibold">
                              {unreadCount} yeni mesaj
                            </span>
                          </div>
                        )}
                      </div>

                      {diet.hedef && (
                        <div className="mt-2 inline-flex items-center px-3 py-1 bg-yellow-50 text-yellow-800 rounded-full text-xs font-medium">
                          <Sparkles className="w-3 h-3 mr-1.5" />
                          {diet.hedef}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {unreadCount > 0 && (
                      <div className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {unreadCount}
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
