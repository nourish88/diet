"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  Pencil,
  CalendarRange,
  ClipboardList,
  PlusCircle,
  Phone,
  FileText,
  User,
  ChevronLeft,
  Loader2,
  MessageCircle,
  TrendingUp,
  Activity,
  Mail,
  Unlink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { useClient } from "@/hooks/useApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import dynamic from "next/dynamic";
import DateRangePicker from "@/components/progress/DateRangePicker";

const ProgressChart = dynamic(() => import("@/components/progress/ProgressChart"), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  ),
});

const ProgressSummary = dynamic(() => import("@/components/progress/ProgressSummary"), {
  loading: () => (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
    </div>
  ),
});

const ExerciseChart = dynamic(() => import("@/components/exercises/ExerciseChart"), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  ),
});
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressEntry, calculateProgressSummary, getChartData } from "@/services/ProgressService";
import { ExerciseLog, groupByExerciseType, getExerciseStats } from "@/services/ExerciseService";
import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ClientDetailPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();

  const clientId = params?.id ? Number(params.id) : undefined;
  
  // Date range for progress and exercise filtering
  const [progressDateFrom, setProgressDateFrom] = useState<Date | null>(null);
  const [progressDateTo, setProgressDateTo] = useState<Date | null>(null);
  const [exerciseDateFrom, setExerciseDateFrom] = useState<Date | null>(null);
  const [exerciseDateTo, setExerciseDateTo] = useState<Date | null>(null);
  
  // Unlink dialog state
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const queryClient = useQueryClient();

  // Use React Query hook for data fetching with automatic caching
  const { data: client, isLoading, error } = useClient(clientId);

  // Fetch unread message counts
  interface UnreadMessagesData { totalUnread: number; unreadByDiet: Record<number, number> }
  const { data: unreadData } = useQuery<UnreadMessagesData | null>({
    queryKey: ["unreadMessages", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      try {
        return await apiClient.get<UnreadMessagesData>(`/clients/${clientId}/unread-messages`);
      } catch (error) {
        console.log("❌ Unread messages API error:", error);
        return null;
      }
    },
    enabled: !!clientId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch progress entries
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ["progress", clientId, progressDateFrom, progressDateTo],
    queryFn: async () => {
      if (!clientId) return null;
      const params = new URLSearchParams();
      params.append("clientId", clientId.toString());
      if (progressDateFrom) {
        params.append("dateFrom", progressDateFrom.toISOString());
      }
      if (progressDateTo) {
        params.append("dateTo", progressDateTo.toISOString());
      }

      const data = await apiClient.get<{ entries: ProgressEntry[] }>(`/progress?${params.toString()}`);
      return data.entries || [];
    },
    enabled: !!clientId,
  });

  // Fetch exercise logs
  const { data: exerciseData, isLoading: exerciseLoading } = useQuery({
    queryKey: ["exercises", clientId, exerciseDateFrom, exerciseDateTo],
    queryFn: async () => {
      if (!clientId) return null;
      const params = new URLSearchParams();
      params.append("clientId", clientId.toString());
      if (exerciseDateFrom) {
        params.append("dateFrom", exerciseDateFrom.toISOString());
      }
      if (exerciseDateTo) {
        params.append("dateTo", exerciseDateTo.toISOString());
      }

      const data = await apiClient.get<{ logs: ExerciseLog[] }>(`/exercises?${params.toString()}`);
      return data.logs || [];
    },
    enabled: !!clientId,
  });

  // Memoize progress calculations
  const progressSummary = useMemo(() => {
    if (!progressData || progressData.length === 0) return null;
    return calculateProgressSummary(
      progressData,
      progressDateFrom || undefined,
      progressDateTo || undefined
    );
  }, [progressData, progressDateFrom, progressDateTo]);

  const progressChartData = useMemo(() => {
    if (!progressData || progressData.length === 0) return null;
    return getChartData(
      progressData,
      progressDateFrom || undefined,
      progressDateTo || undefined
    );
  }, [progressData, progressDateFrom, progressDateTo]);

  const progressFlags = useMemo(() => {
    if (!progressData) return { hasWeight: false, hasWaist: false, hasHip: false, hasBodyFat: false };
    return {
      hasWeight: progressData.some((e: ProgressEntry) => e.weight !== null),
      hasWaist: progressData.some((e: ProgressEntry) => e.waist !== null),
      hasHip: progressData.some((e: ProgressEntry) => e.hip !== null),
      hasBodyFat: progressData.some((e: ProgressEntry) => e.bodyFat !== null),
    };
  }, [progressData]);

  // Memoize exercise calculations
  const exerciseStats = useMemo(() => {
    if (!exerciseData || exerciseData.length === 0) return null;
    return getExerciseStats(
      exerciseData,
      exerciseDateFrom || undefined,
      exerciseDateTo || undefined
    );
  }, [exerciseData, exerciseDateFrom, exerciseDateTo]);

  const exerciseChartData = useMemo(() => {
    if (!exerciseData || exerciseData.length === 0) return null;
    return groupByExerciseType(
      exerciseData,
      exerciseDateFrom || undefined,
      exerciseDateTo || undefined
    );
  }, [exerciseData, exerciseDateFrom, exerciseDateTo]);

  // Memoize date change handlers
  const handleProgressDateChange = useCallback((from: Date | null, to: Date | null) => {
    setProgressDateFrom(from);
    setProgressDateTo(to);
  }, []);

  const handleExerciseDateChange = useCallback((from: Date | null, to: Date | null) => {
    setExerciseDateFrom(from);
    setExerciseDateTo(to);
  }, []);

  // Handle unlink client from user account
  const handleUnlink = useCallback(async () => {
    if (!clientId) return;

    setIsUnlinking(true);
    try {
      await apiClient.post(`/clients/${clientId}/unlink`);

      toast({
        title: "Başarılı",
        description: "Danışan hesabı ile ilişki kaldırıldı. Tekrar eşleştirme yapılabilir.",
        variant: "default",
      });

      setShowUnlinkDialog(false);
      // Refetch client data using React Query
      await queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    } catch (error: any) {
      console.error("Error unlinking client:", error);
      toast({
        title: "Hata",
        description: error.message || "İlişki kaldırılırken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(false);
    }
  }, [clientId, toast, queryClient, router]);

  // Update the formatDate function to properly handle the date format
  const formatDate = (dateString: string | null | undefined) => {
    console.log("Formatting date:", dateString); // Debug log
    if (!dateString) return "Belirtilmemiş";

    try {
      // First parse the ISO string to a Date object
      const date = parseISO(dateString);
      console.log("Parsed date:", date); // Debug log

      if (isNaN(date.getTime())) {
        console.log("Invalid date after parsing"); // Debug log
        return "Belirtilmemiş";
      }

      const formatted = format(date, "d MMMM yyyy", { locale: tr });
      console.log("Formatted date:", formatted); // Debug log
      return formatted;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Belirtilmemiş";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <span className="ml-2 text-gray-600">
            Danışan bilgileri yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-gray-900">
            Danışan bulunamadı
          </h3>
          <p className="mt-2 text-gray-500">
            Aradığınız danışan mevcut değil veya silinmiş olabilir.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => router.push("/clients")}
              className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
            >
              Danışan Listesine Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Danışan Listesine Dön
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-medium">
              {client.name} {client.surname}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Danışan #{client.id} | Kayıt: {formatDate(client.createdAt)}
            </p>
          </div>
          <Button
            onClick={() => router.push(`/clients/${client.id}/edit`)}
            variant="outline"
            className="bg-white text-indigo-700 hover:bg-indigo-50"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client basic information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                Kişisel Bilgiler
              </h3>

              <div className="flex items-start">
                <CalendarRange className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Doğum Tarihi
                  </div>
                  <div className="text-gray-800">
                    {formatDate(client.birthdate)}
                  </div>
                </div>
              </div>

              {/* Add Illness Information */}
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Hastalık
                  </div>
                  <div className="text-gray-800">
                    {client.illness || "Belirtilmemiş"}
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Telefon
                  </div>
                  <div className="text-gray-800">
                    {client.phoneNumber || "Belirtilmemiş"}
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-600">
                    E-posta
                  </div>
                  <div className="text-gray-800">
                    {client.user?.email || "E-posta ilişkilendirilmemiş"}
                  </div>
                  {!client.user?.email && (
                    <div className="text-xs text-amber-600 mt-1">
                      Danışan hesabı ile eşleştirme yapılmamış
                    </div>
                  )}
                </div>
              </div>

              {/* Add Gender */}
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-indigo-500 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-700">Cinsiyet</h4>
                  <p className="text-gray-600">
                    {client.gender === 1 || client.gender === "1"
                      ? "Erkek"
                      : client.gender === 2 || client.gender === "2"
                      ? "Kadın"
                      : "Belirtilmemiş"}
                  </p>
                </div>
              </div>

              {/* Unlink Button - Only show if client has userId */}
              {client.userId && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="destructive"
                    onClick={() => setShowUnlinkDialog(true)}
                    className="w-full"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    İlişki Kaldır
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    İlişki kaldırıldıktan sonra danışan tekrar e-posta ve şifre ile eşleştirilebilir.
                  </p>
                </div>
              )}
            </div>

            {/* Client notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b pb-2">
                Notlar
              </h3>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-gray-800 whitespace-pre-wrap">
                  {client.notes || "Herhangi bir not bulunmuyor."}
                </div>
              </div>
            </div>

            {/* Add Banned Foods section */}
            <div className="col-span-full mt-4">
              <h4 className="font-medium text-gray-700 mb-3">
                Yasaklı Besinler
              </h4>
              {client.bannedFoods && client.bannedFoods.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {client.bannedFoods.map((banned) => (
                    <div
                      key={banned.besin.id}
                      className="p-3 bg-red-50 border border-red-100 rounded-lg"
                    >
                      <p className="font-medium text-red-700">
                        {banned.besin.name}
                      </p>
                      {banned.reason && (
                        <p className="text-sm text-red-600 mt-1">
                          Sebep: {banned.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Yasaklı besin bulunmamaktadır</p>
              )}
            </div>
          </div>

          {/* Client diet history */}
          <div className="mt-8">
            <div className="border-b border-gray-200 pb-2 mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                <ClipboardList className="h-5 w-5 text-indigo-500 mr-2" />
                Beslenme Programları
              </h3>
              <Button
                onClick={() => router.push(`/diets/new?clientId=${client.id}`)}
                className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
                size="sm"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Yeni Program Ekle
              </Button>
            </div>

            {client.diets && client.diets.length > 0 ? (
              <div className="space-y-3">
                {client.diets.map((diet) => (
                  <div
                    key={diet.id}
                    className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/diets/${diet.id}`)}
                      >
                        <div className="font-medium">
                          Beslenme Programı #{diet.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          Oluşturulma: {formatDate(diet.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {diet.tarih && (
                          <div className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                            Program Tarihi: {formatDate(diet.tarih)}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/clients/${client.id}/messages?dietId=${diet.id}`
                            );
                          }}
                          className="flex items-center gap-2 relative"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Mesajlaşma
                          {unreadData && unreadData.unreadByDiet && unreadData.unreadByDiet[diet.id] > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {unreadData?.unreadByDiet?.[diet.id] ?? 0}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Henüz diyet bulunmuyor.</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Tracking Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <CardTitle>Gelişim Takibi</CardTitle>
            </div>
            <DateRangePicker
              dateFrom={progressDateFrom}
              dateTo={progressDateTo}
              onDateChange={handleProgressDateChange}
            />
          </div>
          <CardDescription>
            Danışanın kilo, ölçü ve vücut yağ oranı takibi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
          ) : progressData && progressData.length > 0 ? (
            <>
              {progressSummary && (
                <div className="mb-6">
                  <ProgressSummary summary={progressSummary} />
                </div>
              )}
              {progressChartData && (
                <ProgressChart
                  data={progressChartData}
                  showWeight={progressFlags.hasWeight}
                  showWaist={progressFlags.hasWaist}
                  showHip={progressFlags.hasHip}
                  showBodyFat={progressFlags.hasBodyFat}
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Henüz gelişim verisi bulunmuyor</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise Tracking Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <CardTitle>Antrenman Takibi</CardTitle>
            </div>
            <DateRangePicker
              dateFrom={exerciseDateFrom}
              dateTo={exerciseDateTo}
              onDateChange={handleExerciseDateChange}
            />
          </div>
          <CardDescription>
            Danışanın egzersiz ve aktivite kayıtları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exerciseLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
          ) : exerciseData && exerciseData.length > 0 ? (
            <>
              {exerciseStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Toplam Egzersiz</p>
                    <p className="text-2xl font-bold">{exerciseStats.totalExercises}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Toplam Süre</p>
                    <p className="text-2xl font-bold">{exerciseStats.totalDuration} dk</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Toplam Adım</p>
                    <p className="text-2xl font-bold">
                      {exerciseStats.totalSteps.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {exerciseChartData && <ExerciseChart data={exerciseChartData} />}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Henüz egzersiz kaydı bulunmuyor</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İlişkiyi Kaldır</DialogTitle>
            <DialogDescription>
              Bu işlem danışan hesabı ile ilişkiyi kaldıracak. Danışan daha sonra
              tekrar e-posta ve şifre ile eşleştirilebilir. Devam etmek istediğinize
              emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnlinkDialog(false)}
              disabled={isUnlinking}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaldırılıyor...
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4 mr-2" />
                  İlişkiyi Kaldır
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
