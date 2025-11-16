"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PresetService from "@/services/PresetService";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

interface BesinStat {
  id: number;
  name: string;
  usageCount: number;
  avgMiktar?: string;
  commonBirim?: string;
  lastUsed?: Date;
  groupName?: string;
}

interface AnalyticsData {
  topBesins: BesinStat[];
  totals: {
    totalDiets: number;
    dietsThisMonth: number;
    dietsLastMonth: number;
  };
  efficiency: {
    avgTimeThisMonth: number;
    avgTimeLastMonth: number;
    improvement: number;
  };
}

export default function IstatistiklerPage() {
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);
  const { toast } = useToast();

  // Use React Query for data fetching
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['analytics', 'stats'],
    queryFn: async () => {
      return apiClient.get<AnalyticsData>("/analytics/stats");
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const handleAutoGeneratePresets = async () => {
    try {
      setIsGeneratingPresets(true);
      const result = await PresetService.autoGeneratePresets();

      toast({
        title: "Başarılı",
        description: result.message,
      });
      
      // Refetch analytics after generating presets
      refetch();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Preset oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPresets(false);
    }
  };

  // Handle error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-16">
          <p className="text-red-600 mb-4">
            İstatistikler yüklenirken bir hata oluştu: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
          </p>
          <Button onClick={() => refetch()}>Tekrar Dene</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">İstatistikler</h1>
        <p className="text-gray-600 mt-2">
          Kullanım alışkanlıklarınızı ve verimlilik metriklerinizi görün
        </p>
      </div>

      <Tabs defaultValue="besins" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="besins">
            <BarChart3 className="h-4 w-4 mr-2" />
            Besin İstatistikleri
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <Sparkles className="h-4 w-4 mr-2" />
            Pattern'ler
          </TabsTrigger>
          <TabsTrigger value="efficiency">
            <TrendingUp className="h-4 w-4 mr-2" />
            Verimlilik
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Besin İstatistikleri */}
        <TabsContent value="besins">
          <Card>
            <CardHeader>
              <CardTitle>📊 En Sık Kullanılan Besinler</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Yükleniyor...</span>
                </div>
              ) : analyticsData?.topBesins &&
                analyticsData.topBesins.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.topBesins.map((besin, index) => (
                    <div
                      key={besin.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {besin.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {besin.groupName || "Diğer"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {besin.usageCount}× kullanıldı
                        </p>
                        {(besin.avgMiktar || besin.commonBirim) && (
                          <p className="text-sm text-gray-600">
                            {besin.avgMiktar} {besin.commonBirim}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Henüz istatistik bulunmuyor</p>
                  <p className="text-sm mt-1">
                    Daha fazla diyet yazdıkça istatistikler oluşacak
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Pattern'ler */}
        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>🎯 Öğün Pattern'leri</span>
                <Button
                  onClick={handleAutoGeneratePresets}
                  disabled={isGeneratingPresets}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isGeneratingPresets ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Otomatik Preset Oluştur
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900">
                  <strong>💡 Nasıl çalışır?</strong>
                </p>
                <p className="text-sm text-purple-800 mt-2">
                  Sistem son 30 diyetinizi analiz edip benzer öğün
                  kombinasyonlarını tespit eder ve otomatik preset'ler
                  oluşturur.
                </p>
                <p className="text-sm text-purple-800 mt-2">
                  En az 5 diyet yazmanız gerekir.
                </p>
                <ul className="text-sm text-purple-800 mt-2 ml-4 list-disc">
                  <li>%70+ benzerlik varsa pattern tespit edilir</li>
                  <li>Otomatik preset olarak kaydedilir</li>
                  <li>Diyet yazarken hızlıca kullanabilirsiniz</li>
                </ul>
              </div>

              {/* Buraya gelecekte tespit edilen pattern'leri gösterebiliriz */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Verimlilik */}
        <TabsContent value="efficiency">
          <Card>
            <CardHeader>
              <CardTitle>⚡ Verimlilik Metrikleri</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Yükleniyor...</span>
                </div>
              ) : analyticsData ? (
                <div className="space-y-6">
                  {/* This Month */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3">Bu Ay</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-800">Toplam Diyet:</span>
                        <span className="font-semibold text-green-900">
                          {analyticsData.totals.dietsThisMonth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-800">
                          Ortalama Süre (tahmini):
                        </span>
                        <span className="font-semibold text-green-900">
                          {analyticsData.efficiency.avgTimeThisMonth} dakika
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Last Month */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Geçen Ay
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Toplam Diyet:</span>
                        <span className="font-semibold text-gray-900">
                          {analyticsData.totals.dietsLastMonth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Ortalama Süre:</span>
                        <span className="font-semibold text-gray-900">
                          {analyticsData.efficiency.avgTimeLastMonth} dakika
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Improvement */}
                  {analyticsData.efficiency.improvement > 0 && (
                    <div className="bg-indigo-50 border-2 border-indigo-300 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                        <div>
                          <p className="font-semibold text-indigo-900">
                            📈 İyileşme: %{analyticsData.efficiency.improvement}{" "}
                            daha hızlı!
                          </p>
                          <p className="text-sm text-indigo-700 mt-1">
                            Akıllı sistem kullanımınız sayesinde daha verimli
                            çalışıyorsunuz
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Stats */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {analyticsData.totals.totalDiets}
                        </p>
                        <p className="text-sm text-purple-800">Toplam Diyet</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {analyticsData.topBesins.length}
                        </p>
                        <p className="text-sm text-blue-800">
                          Farklı Besin Kullanımı
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
}
