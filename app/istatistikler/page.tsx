"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  Loader2, 
  Users, 
  FileText, 
  CheckCircle2,
  CalendarDays,
  TrendingDown,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PresetService from "@/services/PresetService";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface BesinStat {
  id: number;
  name: string;
  usageCount: number;
  avgMiktar?: string;
  commonBirim?: string;
  lastUsed?: Date;
  groupName?: string;
}

interface MonthlyData {
  period: string;
  diets: number;
  clients: number;
  month?: string; // backwards compatibility if needed
}

interface AnalyticsData {
  topBesins: BesinStat[];
  totalClients: number;
  totalDiets: number;
  periodDiets: number;
  pendingApprovals: number;
  newClientsPeriod: number;
  newClientsPrevPeriod: number;
  kvkkConsentsPeriod: number;
  chartData: MonthlyData[];
  totals: {
    totalDiets: number;
    dietsPeriod: number;
    dietsPrevPeriod: number;
  };
  efficiency: {
    avgTimeThisMonth: number;
    avgTimeLastMonth: number;
    improvement: number;
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl">
        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
            <span className="font-medium text-slate-900 dark:text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function IstatistiklerPage() {
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);
  const [timeRange, setTimeRange] = useState("current_month");
  const [chartView, setChartView] = useState("monthly");
  const { toast } = useToast();

  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['analytics', 'stats', timeRange, chartView],
    queryFn: async () => {
      return apiClient.get<AnalyticsData>(`/analytics/stats?timeRange=${timeRange}&chartView=${chartView}`);
    },
    staleTime: 5 * 60 * 1000,
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

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30 max-w-md">
          <Activity className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">Bağlantı Hatası</h3>
          <p className="text-red-600 dark:text-red-500/80 mb-6">
            {error instanceof Error ? error.message : 'İstatistikler yüklenirken bir sorun oluştu.'}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="border-red-200 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/50">
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  const clientGrowth = analyticsData 
    ? ((analyticsData.newClientsPeriod - analyticsData.newClientsPrevPeriod) / Math.max(1, analyticsData.newClientsPrevPeriod)) * 100 
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-brand-gradient tracking-tight">
            İstatistikler & Analiz
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Kliniğinizin büyüme ve performans verilerini inceleyin
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Zaman Aralığı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">İçinde Bulunulan Ay</SelectItem>
              <SelectItem value="24h">Son 24 Saat</SelectItem>
              <SelectItem value="7d">Son 7 Gün</SelectItem>
              <SelectItem value="30d">Son 30 Gün</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2 text-indigo-500" />}
            Verileri Yenile
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-indigo-100 font-medium">Toplam Danışan</CardDescription>
            <CardTitle className="text-4xl font-bold flex items-center justify-between">
              {isLoading ? <Loader2 className="h-8 w-8 animate-spin opacity-50" /> : analyticsData?.totalClients || 0}
              <Users className="h-8 w-8 text-indigo-200" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-indigo-100 mt-2">
              {clientGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1 text-green-300" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1 text-red-300" />
              )}
              <span>Seçili dönemde <strong className="text-white">+{analyticsData?.newClientsPeriod || 0}</strong> yeni kayıt</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-medium">Yazılan Diyet</CardDescription>
            <CardTitle className="text-4xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              {isLoading ? <Loader2 className="h-8 w-8 animate-spin opacity-50" /> : analyticsData?.periodDiets || 0}
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Toplam: <strong className="text-slate-700 dark:text-slate-300">{analyticsData?.totalDiets || 0}</strong> diyet
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-medium">KVKK Onayları</CardDescription>
            <CardTitle className="text-4xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              {isLoading ? <Loader2 className="h-8 w-8 animate-spin opacity-50" /> : analyticsData?.kvkkConsentsPeriod || 0}
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Sisteme giriş yapan yeni onaylar
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-50 font-medium">Bekleyen Onaylar</CardDescription>
            <CardTitle className="text-4xl font-bold flex items-center justify-between">
              {isLoading ? <Loader2 className="h-8 w-8 animate-spin opacity-50" /> : analyticsData?.pendingApprovals || 0}
              <CalendarDays className="h-8 w-8 text-orange-100" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-100 mt-2">
              Mobil uygulama giriş bekleyenler
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-8">
        <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="foods" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4 mr-2" />
            Besin & Pattern Analizi
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Genel Bakış */}
        <TabsContent value="overview" className="space-y-6">
          <div className="flex justify-end mb-2">
            <Select value={chartView} onValueChange={setChartView}>
              <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Grafik Görünümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Aylık Analiz</SelectItem>
                <SelectItem value="weekly">Haftalık Analiz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Diets Chart */}
            <Card className="shadow-lg border-slate-200/60 dark:border-slate-800/60">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center text-slate-800 dark:text-slate-100">
                  <FileText className="h-5 w-5 mr-2 text-indigo-500" />
                  Yazılan Diyetler
                </CardTitle>
                <CardDescription>Performans grafiği</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDiets" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="diets" name="Diyet" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorDiets)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly New Clients Chart */}
            <Card className="shadow-lg border-slate-200/60 dark:border-slate-800/60">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center text-slate-800 dark:text-slate-100">
                  <Users className="h-5 w-5 mr-2 text-emerald-500" />
                  Yeni Danışan Kazanımı
                </CardTitle>
                <CardDescription>Danışan kayıtları grafiği</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9', opacity: 0.4}} />
                        <Bar dataKey="clients" name="Yeni Danışan" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Besinler ve Patternler */}
        <TabsContent value="foods" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-slate-200/60 dark:border-slate-800/60">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-rose-500" />
                  En Sık Kullanılan Besinler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                  </div>
                ) : analyticsData?.topBesins && analyticsData.topBesins.length > 0 ? (
                  <div className="space-y-4">
                    {analyticsData.topBesins.map((besin, index) => {
                      // Calculate percentage for progress bar relative to the top item
                      const maxUsage = analyticsData.topBesins[0].usageCount;
                      const percentage = Math.max(5, (besin.usageCount / maxUsage) * 100);
                      
                      return (
                        <div key={besin.id} className="relative">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-4">{index + 1}.</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{besin.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {besin.groupName || "Diğer"}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {besin.usageCount}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-rose-400 to-rose-500 h-1.5 rounded-full transition-all duration-1000 ease-out" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500">
                    <div className="bg-slate-50 dark:bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-medium">Henüz istatistik bulunmuyor</p>
                    <p className="text-sm mt-1 text-slate-400">Diyet yazdıkça besin kullanım istatistikleriniz burada belirecek.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-slate-200/60 dark:border-slate-800/60 flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                  <div className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
                    Akıllı Pattern Analizi
                  </div>
                  <Button
                    onClick={handleAutoGeneratePresets}
                    disabled={isGeneratingPresets}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                  >
                    {isGeneratingPresets ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>Yapay zeka destekli öğün patternleri</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-white dark:bg-slate-900 shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                    <Sparkles className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="text-amber-900 dark:text-amber-400 font-semibold mb-2">Otomatik Presetler</h3>
                  <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mb-4">
                    Sistem son diyetlerinizi analiz eder ve en sık kullandığınız öğün kombinasyonlarını tespit ederek sizin için hazır şablonlar (preset) oluşturur.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-100/50 dark:bg-amber-900/50 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" /> En az %70 benzerlik arar
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
}
