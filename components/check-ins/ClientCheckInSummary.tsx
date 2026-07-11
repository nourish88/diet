"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type CheckIn = {
  id: number;
  isTest: boolean;
  weekStart: string;
  adherence: number | null;
  hunger: number | null;
  energy: number | null;
  sleep: number | null;
  water: number | null;
  exercise: number | null;
  satisfaction: number | null;
  challenge: string | null;
  supportRequest: string | null;
  submittedAt: string | null;
  contactedAt: string | null;
  resolvedAt: string | null;
};

const scoreLabels: Array<[keyof CheckIn, string]> = [
  ["adherence", "Uyum"],
  ["hunger", "Açlık"],
  ["energy", "Enerji"],
  ["sleep", "Uyku"],
  ["water", "Su"],
  ["exercise", "Hareket"],
];

export function ClientCheckInSummary({ clientId }: { clientId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["client-check-in-latest", clientId],
    queryFn: () =>
      apiClient.get<{ checkIn: CheckIn | null }>(
        `/clients/${clientId}/check-ins/latest`,
      ),
  });

  const contactedMutation = useMutation({
    mutationFn: (checkInId: number) =>
      apiClient.patch<{ contactedAt: string }>(
        `/clients/${clientId}/check-ins/${checkInId}/contacted`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-check-in-latest", clientId],
      });
      queryClient.invalidateQueries({ queryKey: ["check-in-alerts"] });
      toast({
        title: "İletişim kaydedildi",
        description: "Bu uyarı işlem yapılmış olarak işaretlendi.",
      });
    },
    onError: (error: Error) =>
      toast({
        title: "İşlem kaydedilemedi",
        description: error.message,
        variant: "destructive",
      }),
  });

  if (query.isLoading) {
    return (
      <div className="mb-4 rounded-xl border bg-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Haftalık kontrol yükleniyor...
      </div>
    );
  }
  const checkIn = query.data?.checkIn;
  if (!checkIn) return null;

  const dissatisfied = checkIn.satisfaction !== null && checkIn.satisfaction <= 2;
  const needsAttention = dissatisfied && !checkIn.contactedAt;
  const submittedLabel = checkIn.submittedAt
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(checkIn.submittedAt))
    : "";

  return (
    <section
      className={`mb-4 overflow-hidden rounded-2xl border-2 ${
        needsAttention
          ? "border-destructive bg-destructive/10"
          : dissatisfied
            ? "border-amber-400/60 bg-amber-50 dark:bg-amber-950/20"
            : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-xl p-2.5 ${
                needsAttention
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-card text-brand"
              }`}
            >
              {needsAttention ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <ClipboardCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className={`font-bold ${needsAttention ? "text-destructive" : ""}`}>
                {needsAttention
                  ? "Danışan memnuniyetsizlik bildirdi"
                  : "Son haftalık kontrol"}
              </h2>
              {checkIn.isTest && (
                <span className="inline-flex mt-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  TEST KAYDI
                </span>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {submittedLabel} tarihinde dolduruldu
              </p>
              {needsAttention && (
                <p className="text-sm font-medium text-destructive mt-2">
                  Diyeti yazmadan önce danışanla iletişime geçmeniz önerilir.
                </p>
              )}
            </div>
          </div>
          {needsAttention ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={contactedMutation.isPending}
              onClick={() => contactedMutation.mutate(checkIn.id)}
            >
              {contactedMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PhoneCall className="h-4 w-4 mr-2" />
              )}
              İletişime geçildi
            </Button>
          ) : checkIn.contactedAt ? (
            <span className="inline-flex items-center text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> İletişim kaydedildi
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-5">
          {scoreLabels.map(([key, label]) => (
            <div key={key} className="rounded-xl border bg-card/90 px-2 py-2.5 text-center">
              <div className="text-lg font-bold text-foreground">
                {checkIn[key] as number | null}/5
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {(checkIn.challenge || checkIn.supportRequest) && (
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {checkIn.challenge && (
              <div className="rounded-xl border bg-card/90 p-3">
                <p className="text-xs font-semibold text-muted-foreground">En çok zorlandığı konu</p>
                <p className="text-sm mt-1.5 whitespace-pre-wrap">{checkIn.challenge}</p>
              </div>
            )}
            {checkIn.supportRequest && (
              <div className="rounded-xl border bg-card/90 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Beklediği destek</p>
                <p className="text-sm mt-1.5 whitespace-pre-wrap">{checkIn.supportRequest}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
