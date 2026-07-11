"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BellRing, ChevronRight, Inbox, Loader2, Mail, MailOpen } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type NotificationItem = {
  id: number;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  broadcastMessage: {
    id: number;
    title: string;
    message: string;
    dietitianName: string;
    createdAt: string;
  };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function ClientNotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["client-notifications"],
    queryFn: () => apiClient.get<{ notifications: NotificationItem[]; unreadCount: number }>("/client/portal/notifications"),
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-brand via-brand/90 to-violet-600 text-white p-6 sm:p-8 shadow-xl shadow-brand/10">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute right-16 -bottom-20 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex items-start gap-4">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur"><BellRing className="h-7 w-7" /></div>
          <div><p className="text-white/75 text-sm font-medium">Diyetisyeninizden</p><h1 className="text-2xl sm:text-3xl font-bold mt-1">Bildirimler</h1><p className="text-white/80 text-sm mt-2">Size özel duyurular ve bilgilendirmeler burada güvende.</p></div>
        </div>
        {!!data?.unreadCount && <div className="relative mt-6 inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur"><Mail className="h-4 w-4 mr-2" />{data.unreadCount} okunmamış mesaj</div>}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div> : !data?.notifications.length ? (
          <div className="rounded-2xl border bg-card py-16 px-6 text-center"><Inbox className="h-12 w-12 mx-auto text-muted-foreground/40" /><h2 className="font-semibold mt-4">Henüz bildiriminiz yok</h2><p className="text-sm text-muted-foreground mt-1">Diyetisyeniniz yeni bir mesaj gönderdiğinde burada görünecek.</p></div>
        ) : data.notifications.map((item) => (
          <Link key={item.id} href={`/client/notifications/${item.id}`} className={`group block rounded-2xl border p-4 sm:p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${item.isRead ? "bg-card" : "bg-brand-soft/60 border-brand/30 shadow-sm"}`}>
            <div className="flex items-start gap-4">
              <div className={`mt-0.5 rounded-xl p-2.5 ${item.isRead ? "bg-muted text-muted-foreground" : "bg-brand text-white"}`}>{item.isRead ? <MailOpen className="h-5 w-5" /> : <Mail className="h-5 w-5" />}</div>
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold leading-6">{item.broadcastMessage.title}</h2>{!item.isRead && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand shrink-0" />}</div><p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 whitespace-pre-wrap">{item.broadcastMessage.message}</p><div className="flex items-center justify-between gap-3 mt-3"><p className="text-xs text-muted-foreground">{item.broadcastMessage.dietitianName} · {formatDate(item.broadcastMessage.createdAt)}</p><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
