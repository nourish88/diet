"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Droplet,
  Target,
  TrendingUp,
  Activity,
  MessageCircle,
  ArrowLeft,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import DatabasePDFButton from "@/components/DatabasePDFButton";
import { useToast } from "@/components/ui/use-toast";

interface DietDetail {
  id: number;
  tarih: string;
  createdAt: string;
  su: string;
  sonuc: string;
  hedef: string;
  fizik: string;
  dietitianNote: string;
  oguns: Array<{
    id: number;
    name: string;
    time: string;
    detail: string;
    items: Array<{
      id: number;
      miktar: number;
      besin: {
        name: string;
      };
      birim: {
        name: string;
      };
    }>;
  }>;
}

export default function ClientDietDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const dietId = (params?.id as string) || "";
  const { toast } = useToast();

  const [expandedOguns, setExpandedOguns] = useState<Record<number, boolean>>({});
  const [highlightedOgunId, setHighlightedOgunId] = useState<number | null>(null);
  const ogunRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["client-diet-detail", dietId],
    enabled: Boolean(dietId),
    queryFn: async () => {
      if (!dietId) throw new Error("Diet ID missing");

      try {
        return await apiClient.get<{
          success: boolean;
          diet: DietDetail & { unreadCount: number; clientId: number };
        }>(`/client/portal/diets/${dietId}`);
      } catch (error: any) {
        if (error?.status === 404) {
          router.push("/client/diets");
        }
        throw error;
      }
    },
  });

  const diet = data?.diet ?? null;
  const unreadCount = diet?.unreadCount ?? 0;
  const clientId = diet?.clientId ?? null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const toggleOgun = (ogunId: number) => {
    setExpandedOguns((prev) => ({
      ...prev,
      [ogunId]: !prev[ogunId],
    }));
  };

  const scrollToOgun = useMemo(() => {
    return (ogunId: number) => {
      // Expand the ogun first
      setExpandedOguns((prev) => ({
        ...prev,
        [ogunId]: true,
      }));

      // Highlight the ogun
      setHighlightedOgunId(ogunId);

      // Scroll to the ogun element
      setTimeout(() => {
        const ogunElement = ogunRefs.current[ogunId];
        if (ogunElement) {
          ogunElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedOgunId(null);
      }, 3000);
    };
  }, []);

  // Handle notification click - URL query params will be handled by the useEffect below
  // The service worker will open the URL with ogunId parameter, and this page will handle it

  // Handle ogunId from URL query params
  useEffect(() => {
    const ogunIdParam = searchParams?.get("ogunId");
    if (ogunIdParam) {
      const ogunId = parseInt(ogunIdParam, 10);
      if (!isNaN(ogunId)) {
        // Wait for diet data to be loaded
        if (diet && diet.oguns && diet.oguns.length > 0) {
          // Check if ogun exists
          const ogun = diet.oguns.find((o) => o.id === ogunId);
          if (ogun) {
            // Scroll to ogun
            scrollToOgun(ogunId);
            
            // Show toast notification (only once)
            const hasScrolled = sessionStorage.getItem(`scrolled-to-ogun-${ogunId}`);
            if (!hasScrolled) {
              toast({
                title: `${ogun.name} zamanı yaklaşıyor!`,
                description: "Öğün detaylarını görmek için aşağı kaydırın.",
              });
              sessionStorage.setItem(`scrolled-to-ogun-${ogunId}`, "true");
              // Clear after 5 seconds to allow scrolling again if needed
              setTimeout(() => {
                sessionStorage.removeItem(`scrolled-to-ogun-${ogunId}`);
              }, 5000);
            }
          }
        }
      }
    }
  }, [searchParams, diet, toast, scrollToOgun]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Diyet yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!diet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Diyet bulunamadı</p>
        <Link
          href="/client/diets"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Diyetlerime Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/client/diets"
            className="flex items-center text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Diyetlerime Dön
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching ? "Yenileniyor..." : "Yenile"}
            </button>
            <DatabasePDFButton
              diet={diet}
              className="bg-white text-blue-600 hover:bg-blue-50"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Diyeti İndir
            </DatabasePDFButton>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">Beslenme Programı #{diet.id}</h1>
        <div className="flex items-center text-blue-100">
          <Calendar className="w-4 h-4 mr-2" />
          {formatDate(diet.tarih)}
        </div>
      </div>

      {/* Messages Button */}
      {clientId && (
        <Link
          href={`/client/diets/${dietId}/messages`}
          className="block bg-white rounded-lg shadow-sm border-l-4 border-blue-600 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <MessageCircle className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Diyetisyenimle İletişim
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                {unreadCount > 0
                  ? `${unreadCount} okunmamış mesajınız var`
                  : "Diyetisyeninize soru sorun ve mesajlaşın"}
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="bg-red-500 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
                {unreadCount}
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Program Özeti
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {diet.hedef && (
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">HEDEF</p>
                <p className="text-sm font-semibold text-gray-900">
                  {diet.hedef}
                </p>
              </div>
            </div>
          )}

          {diet.sonuc && (
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">SONUÇ</p>
                <p className="text-sm font-semibold text-gray-900">
                  {diet.sonuc}
                </p>
              </div>
            </div>
          )}

          {diet.su && (
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Droplet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">SU TÜKETİMİ</p>
                <p className="text-sm font-semibold text-gray-900">{diet.su}</p>
              </div>
            </div>
          )}

          {diet.fizik && (
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">
                  FİZİKSEL AKTİVİTE
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {diet.fizik}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dietitian Note */}
      {diet.dietitianNote && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Diyetisyen Notları
          </h3>
          <p className="text-sm text-blue-800">{diet.dietitianNote}</p>
        </div>
      )}

      {/* Meals */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Günlük Öğün Programı
        </h2>
        <div className="space-y-3">
          {diet.oguns.map((ogun) => {
            const isExpanded = expandedOguns[ogun.id];
            const isHighlighted = highlightedOgunId === ogun.id;
            return (
              <div
                key={ogun.id}
                ref={(el) => {
                  ogunRefs.current[ogun.id] = el;
                }}
                className={`border rounded-lg overflow-hidden transition-all duration-500 ${
                  isHighlighted
                    ? "border-blue-500 shadow-lg ring-2 ring-blue-300 ring-opacity-50"
                    : "border-gray-200"
                }`}
              >
                <button
                  onClick={() => toggleOgun(ogun.id)}
                  className={`w-full flex items-center justify-between p-4 transition-colors ${
                    isHighlighted
                      ? "bg-blue-50 hover:bg-blue-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">
                        {ogun.name}
                      </h3>
                      {ogun.time && (
                        <p className="text-xs text-gray-500">{ogun.time}</p>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 bg-white">
                    {/* Menu items first */}
                    {ogun.items && ogun.items.length > 0 ? (
                      <ul className="space-y-2 mb-3">
                        {ogun.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                          >
                            <span className="text-sm text-gray-700">
                              {item.besin.name}
                            </span>
                            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                              {item.miktar} {item.birim.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-3">
                        Bu öğün için besin eklenmemiş
                      </p>
                    )}
                    {/* Detail after menu items */}
                    {ogun.detail && (
                      <p className="text-sm text-gray-600 italic">
                        {ogun.detail}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

