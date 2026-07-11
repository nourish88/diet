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
  Shield,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { useClient } from "@/hooks/useApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import dynamic from "next/dynamic";
import DateRangePicker from "@/components/progress/DateRangePicker";

const ProgressChart = dynamic(
  () => import("@/components/progress/ProgressChart"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    ),
  }
);

const ProgressSummary = dynamic(
  () => import("@/components/progress/ProgressSummary"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    ),
  }
);

const ExerciseChart = dynamic(
  () => import("@/components/exercises/ExerciseChart"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    ),
  }
);

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ProgressEntry,
  calculateProgressSummary,
  getChartData,
} from "@/services/ProgressService";
import {
  ExerciseLog,
  groupByExerciseType,
  getExerciseStats,
} from "@/services/ExerciseService";
import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationTestPanel } from "@/components/NotificationTestPanel";
import { ClientCheckInHistory } from "@/components/check-ins/ClientCheckInHistory";

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

  // Measurement entry dialog state
  const [showMeasurementDialog, setShowMeasurementDialog] = useState(false);
  const [measurementForm, setMeasurementForm] = useState({ date: "", weight: "", bodyFat: "" });
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false);

  const queryClient = useQueryClient();

  // Use React Query hook for data fetching with automatic caching
  const { data: client, isLoading, error } = useClient(clientId);

  // Fetch unread message counts
  interface UnreadMessagesData {
    totalUnread: number;
    unreadByDiet: Record<number, number>;
  }
  const { data: unreadData } = useQuery<UnreadMessagesData | null>({
    queryKey: ["unreadMessages", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      try {
        return await apiClient.get<UnreadMessagesData>(
          `/clients/${clientId}/unread-messages`
        );
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

      const data = await apiClient.get<{ entries: ProgressEntry[] }>(
        `/progress?${params.toString()}`
      );
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

      const data = await apiClient.get<{ logs: ExerciseLog[] }>(
        `/exercises?${params.toString()}`
      );
      return data.logs || [];
    },
    enabled: !!clientId,
  });

  // Fetch the latest diet (with oguns) so the manual notification test
  // panel can list this client's most recent meals as trigger targets.
  interface LatestDietWithOguns {
    id: number;
    oguns?: Array<{ id: number; name: string; time: string | null }>;
  }
  const { data: latestDietForNotify } = useQuery<LatestDietWithOguns | null>({
    queryKey: ["latestDietForNotify", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      try {
        return await apiClient.get<LatestDietWithOguns>(
          `/diets/latest/${clientId}`
        );
      } catch (error: any) {
        if (error?.status === 404) return null;
        throw error;
      }
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

  const lastProgressEntry = useMemo(() => {
    if (!progressData || progressData.length === 0) return null;
    return [...progressData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [progressData]);

  const progressFlags = useMemo(() => {
    if (!progressData)
      return {
        hasWeight: false,
        hasWaist: false,
        hasHip: false,
        hasBodyFat: false,
      };
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
  const handleProgressDateChange = useCallback(
    (from: Date | null, to: Date | null) => {
      setProgressDateFrom(from);
      setProgressDateTo(to);
    },
    []
  );

  const handleExerciseDateChange = useCallback(
    (from: Date | null, to: Date | null) => {
      setExerciseDateFrom(from);
      setExerciseDateTo(to);
    },
    []
  );

  // Handle unlink client from user account
  const handleUnlink = useCallback(async () => {
    if (!clientId) return;

    setIsUnlinking(true);
    try {
      await apiClient.post(`/clients/${clientId}/unlink`);

      toast({
        title: "Başarılı",
        description:
          "Danışan hesabı ile ilişki kaldırıldı. Tekrar eşleştirme yapılabilir.",
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

  const handleSaveMeasurement = useCallback(async () => {
    if (!clientId || (!measurementForm.weight && !measurementForm.bodyFat)) return;
    setIsSavingMeasurement(true);
    try {
      await apiClient.post(`/clients/${clientId}/progress`, {
        date: measurementForm.date || new Date().toISOString(),
        weight: measurementForm.weight ? parseFloat(measurementForm.weight) : undefined,
        bodyFat: measurementForm.bodyFat ? parseFloat(measurementForm.bodyFat) : undefined,
      });
      toast({ title: "Ölçüm kaydedildi" });
      setShowMeasurementDialog(false);
      setMeasurementForm({ date: "", weight: "", bodyFat: "" });
      queryClient.invalidateQueries({ queryKey: ["progress", clientId] });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Kayıt başarısız", variant: "destructive" });
    } finally {
      setIsSavingMeasurement(false);
    }
  }, [clientId, measurementForm, toast, queryClient]);

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
          <Loader2 className="h-8 w-8 text-brand animate-spin" />
          <span className="ml-2 text-muted-foreground">
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
          <h3 className="text-lg font-medium text-foreground">
            Danışan bulunamadı
          </h3>
          <p className="mt-2 text-muted-foreground">
            Aradığınız danışan mevcut değil veya silinmiş olabilir.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => router.push("/clients")}
              className="bg-brand-gradient hover:opacity-90 text-white"
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
          className="text-brand hover:text-indigo-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Danışan Listesine Dön
        </Link>
      </div>

      <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-white dark:border-indigo-900/60 dark:from-indigo-950/40 dark:to-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand" />
            KVKK / portal açık rıza
          </CardTitle>
          <CardDescription>
            Danışanın uygulama girişinde verdiği son onay özeti (yasal kayıt
            için geçmiş listesi aşağıdaki bağlantıda).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-foreground">
            {client.kvkkPortalConsentAt && client.kvkkPortalConsentVersion ? (
              <>
                <p>
                  <span className="font-medium text-foreground">Son onay: </span>
                  {format(parseISO(client.kvkkPortalConsentAt), "d MMMM yyyy HH:mm", {
                    locale: tr,
                  })}
                </p>
                <p className="text-muted-foreground mt-1 break-words">
                  Sürüm:{" "}
                  <code className="text-xs bg-accent text-accent-foreground px-1 rounded break-all">
                    {client.kvkkPortalConsentVersion}
                  </code>
                </p>
              </>
            ) : (
              <p className="text-foreground">
                Henüz portal üzerinden onay kaydı yok (danışan giriş yaptığında
                istenecek).
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clients/${client.id}/kvkk`}>Geçmiş kayıtlar</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <a
                href={`/api/clients/${client.id}/consents?format=csv`}
                target="_blank"
                rel="noopener noreferrer"
              >
                CSV indir
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden mb-8">
        <div className="bg-brand-gradient px-4 sm:px-6 py-4 text-white flex flex-wrap justify-between items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-medium break-words">
              {client.name} {client.surname}
            </h2>
            <p className="text-sm text-blue-100 mt-1 break-words">
              Danışan #{client.id} | Kayıt: {formatDate(client.createdAt)}
            </p>
          </div>
          <Button
            onClick={() => router.push(`/clients/${client.id}/edit`)}
            variant="outline"
            className="bg-card text-brand hover:bg-brand-soft shrink-0"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
        </div>

        {lastProgressEntry && (lastProgressEntry.weight !== null || lastProgressEntry.bodyFat !== null) && (
          <div className="px-6 py-3 bg-indigo-50/60 border-b border-indigo-100 flex flex-wrap gap-4 text-sm">
            <span className="text-muted-foreground font-medium">Son ölçüm ({new Date(lastProgressEntry.date).toLocaleDateString("tr-TR")}):</span>
            {lastProgressEntry.weight !== null && (
              <span className="flex items-center gap-1.5 font-semibold text-indigo-700">
                <TrendingUp className="h-4 w-4" />
                {lastProgressEntry.weight.toFixed(1)} kg
              </span>
            )}
            {lastProgressEntry.bodyFat !== null && (
              <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                <Activity className="h-4 w-4" />
                %{lastProgressEntry.bodyFat.toFixed(1)} yağ
              </span>
            )}
          </div>
        )}

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client basic information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b pb-2">
                Kişisel Bilgiler
              </h3>

              <div className="flex items-start">
                <CalendarRange className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Doğum Tarihi
                  </div>
                  <div className="text-foreground">
                    {formatDate(client.birthdate)}
                  </div>
                </div>
              </div>

              {/* Add Illness Information */}
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Hastalık
                  </div>
                  <div className="text-foreground">
                    {client.illness || "Belirtilmemiş"}
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Telefon
                  </div>
                  <div className="text-foreground">
                    {client.phoneNumber || "Belirtilmemiş"}
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    E-posta
                  </div>
                  <div className="text-foreground break-all">
                    {client.user?.email || "E-posta ilişkilendirilmemiş"}
                  </div>
                  {!client.user?.email && (
                    <div className="text-xs text-amber-600 mt-1">
                      Danışan hesabı ile eşleştirme yapılmamış
                    </div>
                  )}
                </div>
              </div>

              {/* Phone auth mapping info */}
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Telefon Giriş Eşleşmesi
                  </div>
                  <div className="text-foreground break-all">
                    {client.phoneAuth?.phoneNormalized || "Telefon eşleşmesi yok"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 break-all">
                    {client.user?.email
                      ? `Aktif eşleşen hesap: ${client.user.email}`
                      : "Henüz danışan hesabı ile eşleşmemiş"}
                  </div>
                </div>
              </div>

              {/* Add Gender */}
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-indigo-500 mt-1" />
                <div>
                  <h4 className="font-medium text-foreground">Cinsiyet</h4>
                  <p className="text-muted-foreground">
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
                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    variant="destructive"
                    onClick={() => setShowUnlinkDialog(true)}
                    className="w-full"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    İlişki Kaldır
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    İlişki kaldırıldıktan sonra danışan tekrar telefon ile giriş
                    yaparak eşleşebilir.
                  </p>
                </div>
              )}
            </div>

            {/* Client notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b pb-2">
                Notlar
              </h3>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-foreground whitespace-pre-wrap">
                  {client.notes || "Herhangi bir not bulunmuyor."}
                </div>
              </div>
            </div>

            {/* Add Banned Foods section */}
            <div className="col-span-full mt-4">
              <h4 className="font-medium text-foreground mb-3">
                Yasaklı Besinler
              </h4>
              {client.bannedFoods && client.bannedFoods.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {client.bannedFoods.map((banned) => (
                    <div
                      key={banned.besin.id}
                      className="p-3 bg-destructive/10 border border-red-100 rounded-lg"
                    >
                      <p className="font-medium text-destructive">
                        {banned.besin.name}
                      </p>
                      {banned.reason && (
                        <p className="text-sm text-destructive mt-1">
                          Sebep: {banned.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Yasaklı besin bulunmamaktadır</p>
              )}
            </div>
          </div>

          {/* Client diet history */}
          <div className="mt-8">
            <div className="border-b border-border pb-2 mb-4 flex flex-wrap justify-between items-center gap-2 pr-2 sm:pr-3">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <ClipboardList className="h-5 w-5 text-indigo-500 mr-2" />
                Beslenme Programları
              </h3>
              <Button
                onClick={() => router.push(`/diets/new?clientId=${client.id}`)}
                className="bg-brand-gradient hover:opacity-90 text-white"
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
                    className="border border-border rounded-md p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-3">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/diets/${diet.id}`)}
                      >
                        <div className="font-medium break-words">
                          Beslenme Programı #{diet.id}
                        </div>
                        <div className="text-sm text-muted-foreground break-words">
                          Oluşturulma: {formatDate(diet.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {diet.tarih && (
                          <div className="text-sm text-brand bg-brand-soft px-3 py-1 rounded-full">
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
                          {unreadData &&
                            unreadData.unreadByDiet &&
                            unreadData.unreadByDiet[diet.id] > 0 && (
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
              <p className="text-muted-foreground italic">Henüz diyet bulunmuyor.</p>
            )}
          </div>

          {/*
            Manual notification test panel — lets the dietitian, with the
            client physically next to them, push a real "new diet"
            notification or a specific meal-reminder to the client's device
            so they can both confirm bildirimlerin ulaştığını verify in
            real time. Driven off the latest diet for this client.
          */}
          <div className="mt-8">
            <NotificationTestPanel
              dietId={latestDietForNotify?.id ?? null}
              variant="card"
              oguns={(latestDietForNotify?.oguns ?? []).map((o) => ({
                id: o.id,
                name: o.name,
                time: o.time ?? null,
              }))}
            />
          </div>
        </div>
      </div>

      {clientId && <ClientCheckInHistory clientId={clientId} />}

      {/* Progress Tracking Section */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2 pr-1">
        <Button
          size="sm"
          onClick={() => {
            setMeasurementForm({ date: new Date().toISOString().slice(0, 10), weight: "", bodyFat: "" });
            setShowMeasurementDialog(true);
          }}
          className="bg-brand hover:bg-brand/90 text-white shadow-sm"
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Ölçüm Ekle (Kilo / Yağ)
        </Button>
        <DateRangePicker
          dateFrom={progressDateFrom}
          dateTo={progressDateTo}
          onDateChange={handleProgressDateChange}
        />
      </div>
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-brand" />
            <CardTitle>Gelişim Takibi</CardTitle>
          </div>
          <CardDescription>
            Danışanın kilo, ölçü ve vücut yağ oranı takibi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progressLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-brand animate-spin" />
            </div>
          ) : progressData && progressData.length > 0 ? (
            <>
              {progressSummary && (
                <div className="mb-6">
                  <ProgressSummary summary={progressSummary} />
                  {progressSummary.weightChange !== null && progressSummary.weightChange < 0 && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        onClick={() => {
                          const lostKg = Math.abs(progressSummary.weightChange!).toFixed(1);
                          const fatKg = progressSummary.bodyFatChange !== null && progressSummary.bodyFatChange < 0
                            ? Math.abs(progressSummary.bodyFatChange).toFixed(1)
                            : null;
                          const period = progressSummary.totalDays > 0 ? `${progressSummary.totalDays} günde` : "";
                          const name = client?.name ? `${client.name} ${client.surname ?? ""}`.trim() : "Danışanım";
                          const url = `/api/og/weight-badge?kg=${lostKg}${fatKg ? `&fatKg=${fatKg}` : ""}&period=${encodeURIComponent(period)}&name=${encodeURIComponent(name)}`;
                          window.open(url, "_blank");
                        }}
                      >
                        🏆 Rozet Oluştur
                      </Button>
                    </div>
                  )}
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
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-muted-foreground">Henüz gelişim verisi bulunmuyor</p>
              <Button
                onClick={() => {
                  setMeasurementForm({ date: new Date().toISOString().slice(0, 10), weight: "", bodyFat: "" });
                  setShowMeasurementDialog(true);
                }}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                İlk Ölçümü Ekle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise Tracking Section */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2 pr-1">
        <DateRangePicker
          dateFrom={exerciseDateFrom}
          dateTo={exerciseDateTo}
          onDateChange={handleExerciseDateChange}
        />
      </div>
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-brand" />
            <CardTitle>Antrenman Takibi</CardTitle>
          </div>
          <CardDescription>
            Danışanın egzersiz ve aktivite kayıtları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exerciseLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-brand animate-spin" />
            </div>
          ) : exerciseData && exerciseData.length > 0 ? (
            <>
              {exerciseStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Toplam Egzersiz
                    </p>
                    <p className="text-2xl font-bold">
                      {exerciseStats.totalExercises}
                    </p>
                  </div>
                  <div className="bg-success/10 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Toplam Süre</p>
                    <p className="text-2xl font-bold">
                      {exerciseStats.totalDuration} dk
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Toplam Adım</p>
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
              <p className="text-muted-foreground">Henüz egzersiz kaydı bulunmuyor</p>
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
              Bu işlem danışan hesabı ile ilişkiyi kaldıracak. Danışan daha
              sonra tekrar e-posta ve şifre ile eşleştirilebilir. Devam etmek
              istediğinize emin misiniz?
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

      {/* Ölçüm Ekle Dialog */}
      <Dialog open={showMeasurementDialog} onOpenChange={setShowMeasurementDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yeni Ölçüm Ekle</DialogTitle>
            <DialogDescription>Danışan için kilo ve/veya yağ oranı giriniz.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Tarih</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={measurementForm.date}
                onChange={(e) => setMeasurementForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Kilo (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="ör. 72.5"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={measurementForm.weight}
                onChange={(e) => setMeasurementForm((p) => ({ ...p, weight: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Yağ Oranı (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="ör. 24.3"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={measurementForm.bodyFat}
                onChange={(e) => setMeasurementForm((p) => ({ ...p, bodyFat: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeasurementDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSaveMeasurement}
              disabled={isSavingMeasurement || (!measurementForm.weight && !measurementForm.bodyFat)}
            >
              {isSavingMeasurement ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
