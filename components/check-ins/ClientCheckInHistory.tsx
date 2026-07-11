"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type CheckIn = {
  id: number;
  weekStart: string;
  isTest: boolean;
  adherence: number;
  hunger: number;
  energy: number;
  sleep: number;
  water: number;
  exercise: number;
  satisfaction: number;
  challenge: string | null;
  supportRequest: string | null;
  submittedAt: string;
  contactedAt: string | null;
};

const SCORES: Array<[keyof CheckIn, string]> = [
  ["adherence", "Uyum"],
  ["hunger", "Açlık"],
  ["energy", "Enerji"],
  ["sleep", "Uyku"],
  ["water", "Su"],
  ["exercise", "Hareket"],
  ["satisfaction", "Memnuniyet"],
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function ClientCheckInHistory({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["client-check-ins", clientId],
    queryFn: () =>
      apiClient.get<{ checkIns: CheckIn[] }>(`/clients/${clientId}/check-ins`),
  });
  const contactedMutation = useMutation({
    mutationFn: (checkInId: number) =>
      apiClient.patch(
        `/clients/${clientId}/check-ins/${checkInId}/contacted`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-check-ins", clientId] });
      queryClient.invalidateQueries({ queryKey: ["check-in-alerts"] });
      queryClient.invalidateQueries({
        queryKey: ["client-check-in-latest", clientId],
      });
      toast({ title: "İletişim kaydedildi" });
    },
  });

  const checkIns = query.data?.checkIns ?? [];
  const summary = useMemo(() => {
    const production = checkIns.filter((item) => !item.isTest);
    const average = production.length
      ? production.reduce((sum, item) => sum + item.satisfaction, 0) /
        production.length
      : null;
    return {
      total: production.length,
      average,
      attention: production.filter(
        (item) => item.satisfaction <= 2 && !item.contactedAt,
      ).length,
    };
  }, [checkIns]);

  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="border-b bg-brand-soft/25">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand" /> Haftalık Kontroller
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Danışanın son 52 haftalık değerlendirme geçmişi
            </p>
          </div>
          {!!checkIns.length && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border bg-card px-3 py-1.5">
                {summary.total} form
              </span>
              {summary.average !== null && (
                <span className="rounded-full border bg-card px-3 py-1.5">
                  Ortalama memnuniyet {summary.average.toFixed(1)}/5
                </span>
              )}
              {summary.attention > 0 && (
                <span className="rounded-full bg-destructive px-3 py-1.5 font-semibold text-destructive-foreground">
                  {summary.attention} iletişim bekliyor
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {query.isLoading ? (
          <div className="py-14 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-brand" />
          </div>
        ) : !checkIns.length ? (
          <div className="py-14 px-6 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto opacity-30" />
            <p className="font-medium text-foreground mt-3">Henüz doldurulmuş kontrol yok</p>
            <p className="text-sm mt-1">İlk haftalık form doldurulduğunda burada görünecek.</p>
          </div>
        ) : (
          <div className="divide-y">
            {checkIns.map((checkIn) => {
              const dissatisfied = checkIn.satisfaction <= 2;
              const needsAttention = dissatisfied && !checkIn.contactedAt;
              const expanded = expandedId === checkIn.id;
              return (
                <article
                  key={checkIn.id}
                  className={needsAttention ? "bg-destructive/5" : "bg-card"}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : checkIn.id)}
                    className="w-full p-4 sm:px-5 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`rounded-xl p-2 ${
                            needsAttention
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-brand-soft text-brand"
                          }`}
                        >
                          {needsAttention ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">
                            {formatDate(checkIn.submittedAt)}
                            {checkIn.isTest && (
                              <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                                TEST
                              </span>
                            )}
                          </p>
                          <p className={`text-xs mt-1 ${needsAttention ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                            Memnuniyet {checkIn.satisfaction}/5
                            {needsAttention
                              ? " · İletişim bekliyor"
                              : checkIn.contactedAt
                                ? " · İletişime geçildi"
                                : ""}
                          </p>
                        </div>
                      </div>
                      {expanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t px-4 py-5 sm:px-5">
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {SCORES.map(([key, label]) => (
                          <div key={key} className="rounded-xl border bg-background p-2 text-center">
                            <p className={`font-bold ${key === "satisfaction" && dissatisfied ? "text-destructive" : ""}`}>
                              {checkIn[key] as number}/5
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                      {(checkIn.challenge || checkIn.supportRequest) && (
                        <div className="grid md:grid-cols-2 gap-3 mt-4">
                          {checkIn.challenge && (
                            <div className="rounded-xl border bg-background p-3">
                              <p className="text-xs font-semibold text-muted-foreground">Zorlandığı konu</p>
                              <p className="text-sm mt-1.5 whitespace-pre-wrap">{checkIn.challenge}</p>
                            </div>
                          )}
                          {checkIn.supportRequest && (
                            <div className="rounded-xl border bg-background p-3">
                              <p className="text-xs font-semibold text-muted-foreground">Beklediği destek</p>
                              <p className="text-sm mt-1.5 whitespace-pre-wrap">{checkIn.supportRequest}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {needsAttention && (
                        <div className="mt-4 flex justify-end">
                          <Button
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
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
