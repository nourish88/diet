"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Archive, ArrowLeft, BellRing, CalendarDays, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";

type NotificationDetail = {
  id: number;
  isRead: boolean;
  readAt: string | null;
  archivedAt: string | null;
  broadcastMessage: {
    id: number;
    title: string;
    message: string;
    dietitianName: string;
    createdAt: string;
  };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));

export default function ClientNotificationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["client-notification", params.id],
    queryFn: () => apiClient.get<{ notification: NotificationDetail }>(`/client/portal/notifications/${params.id}`),
    enabled: Boolean(params.id),
  });

  useEffect(() => {
    if (data) queryClient.invalidateQueries({ queryKey: ["client-notifications"] });
  }, [data, queryClient]);

  const archiveMutation = useMutation({
    mutationFn: () =>
      apiClient.patch<{ archived: boolean; archivedAt: string }>(
        `/client/portal/notifications/${params.id}`,
        { archived: true },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notifications"] });
      toast({ title: "Bildirim arşivlendi", description: "Mesaj silinmedi; Arşiv sekmesinden her zaman ulaşabilirsiniz." });
      router.push("/client/notifications");
    },
    onError: (error: any) => toast({ title: "Arşivlenemedi", description: error?.message || "Lütfen tekrar deneyin.", variant: "destructive" }),
  });

  if (isLoading) return <div className="min-h-[50vh] flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>;
  if (isError || !data) return <div className="max-w-xl mx-auto rounded-2xl border bg-card p-8 text-center"><h1 className="font-semibold text-lg">Bildirim bulunamadı</h1><p className="text-sm text-muted-foreground mt-2">Bu bildirim kaldırılmış veya size ait olmayabilir.</p><Link href="/client/notifications" className="inline-flex items-center text-brand font-medium mt-5"><ArrowLeft className="h-4 w-4 mr-2" />Bildirimlere dön</Link></div>;

  const item = data.notification.broadcastMessage;
  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/client/notifications" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5"><ArrowLeft className="h-4 w-4 mr-2" />Tüm bildirimler</Link>
      <article className="overflow-hidden rounded-3xl border bg-card shadow-xl shadow-black/5">
        <div className="relative bg-gradient-to-br from-brand via-brand/90 to-violet-600 text-white px-6 py-8 sm:px-10 sm:py-10">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative"><div className="inline-flex rounded-2xl bg-white/15 p-3 backdrop-blur mb-5"><BellRing className="h-7 w-7" /></div><p className="text-sm text-white/75 font-medium">Size özel mesaj</p><h1 className="text-2xl sm:text-4xl font-bold leading-tight mt-2">{item.title}</h1></div>
        </div>
        <div className="px-6 py-7 sm:px-10 sm:py-10">
          <div className="flex flex-wrap gap-x-6 gap-y-3 border-b pb-6 text-sm text-muted-foreground"><span className="inline-flex items-center"><UserRound className="h-4 w-4 mr-2 text-brand" />{item.dietitianName}</span><span className="inline-flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-brand" />{formatDate(item.createdAt)}</span></div>
          <div className="py-8 text-base sm:text-lg leading-8 text-foreground whitespace-pre-wrap break-words">{item.message}</div>
          {!data.notification.archivedAt && <div className="flex justify-end mb-6"><button type="button" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending} className="inline-flex items-center rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50">{archiveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}Arşive taşı</button></div>}
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900 p-4 flex items-start gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /><p className="text-sm text-emerald-900 dark:text-emerald-200">Bu mesaj kalıcı olarak bildirim geçmişinize kaydedildi. Daha sonra Bildirimler ekranından tekrar ulaşabilirsiniz.</p></div>
        </div>
      </article>
    </div>
  );
}
