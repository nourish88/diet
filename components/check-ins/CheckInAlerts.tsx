"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Loader2, PhoneCall } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type AlertItem = {
  id: number;
  isTest: boolean;
  satisfaction: number;
  challenge: string | null;
  supportRequest: string | null;
  submittedAt: string | null;
  client: { id: number; name: string; surname: string };
};

export function CheckInAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["check-in-alerts"],
    queryFn: () => apiClient.get<{ alerts: AlertItem[] }>("/check-ins/alerts"),
    refetchInterval: 60_000,
  });
  const contactedMutation = useMutation({
    mutationFn: (alert: AlertItem) =>
      apiClient.patch(
        `/clients/${alert.client.id}/check-ins/${alert.id}/contacted`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["check-in-alerts"] });
      toast({ title: "İletişim kaydedildi" });
    },
  });

  const alerts = query.data?.alerts ?? [];
  if (query.isLoading || !alerts.length) return null;

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border-2 border-destructive bg-destructive/10 shadow-sm">
      <div className="flex items-start gap-3 border-b border-destructive/20 px-4 py-4 sm:px-5">
        <div className="rounded-xl bg-destructive p-2.5 text-destructive-foreground">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-destructive">İletişim bekleyen danışanlar</h2>
          <p className="text-sm text-destructive/80 mt-1">
            {alerts.length} danışan haftalık kontrolde memnuniyetini düşük bildirdi.
          </p>
        </div>
      </div>
      <div className="divide-y divide-destructive/15">
        {alerts.map((alert) => {
          const name = `${alert.client.name} ${alert.client.surname}`.trim();
          return (
            <div key={alert.id} className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {name} · Memnuniyet {alert.satisfaction}/5
                  {alert.isTest && (
                    <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      TEST
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {alert.supportRequest || alert.challenge || "Ek açıklama paylaşılmadı."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/diets/new?clientId=${alert.client.id}`}>
                    Formu ve danışanı aç <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={contactedMutation.isPending}
                  onClick={() => contactedMutation.mutate(alert)}
                >
                  {contactedMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PhoneCall className="h-4 w-4 mr-2" />
                  )}
                  İletişime geçildi
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
