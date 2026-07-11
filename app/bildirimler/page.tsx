"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  History,
  Loader2,
  Search,
  Send,
  Smartphone,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Recipient = {
  clientId: number;
  fullName: string;
  userId: number | null;
  subscriptionCount: number;
  dietUpdatesEnabled: boolean;
};
type HistoryRecipient = {
  id: number;
  clientId: number | null;
  clientName: string;
  deliveryStatus: string;
  subscriptionCount: number;
  sentCount: number;
  failedCount: number;
  pushSentAt: string | null;
  deliveredAt: string | null;
  errorMessage: string | null;
  isRead: boolean;
  readAt: string | null;
};
type HistoryMessage = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  recipients: HistoryRecipient[];
  summary: { total: number; read: number; delivered: number; notDelivered: number };
};
type SendResult = {
  broadcastId: number;
  sent: number;
  failed: number;
  skipped: number;
  clients: number;
  persisted: number;
};

const TITLE = "Diyetisyeninizden mesaj var";
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function DeliveryBadge({ recipient }: { recipient: HistoryRecipient }) {
  if (recipient.isRead) {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCheck className="h-3 w-3 mr-1" />Okundu</Badge>;
  }
  if (recipient.deliveredAt) {
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><CheckCheck className="h-3 w-3 mr-1" />Cihaza ulaştı</Badge>;
  }
  if (["failed", "not_subscribed", "push_unavailable"].includes(recipient.deliveryStatus)) {
    const label = recipient.deliveryStatus === "not_subscribed" ? "Aktif cihaz yok" : recipient.deliveryStatus === "push_unavailable" ? "Push kapalı" : "Gönderilemedi";
    return <Badge variant="destructive"><CircleAlert className="h-3 w-3 mr-1" />{label}</Badge>;
  }
  return <Badge variant="secondary"><Clock3 className="h-3 w-3 mr-1" />{recipient.deliveryStatus === "partial" ? "Kısmen gönderildi" : "Okunmadı"}</Badge>;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const recipientsQuery = useQuery({
    queryKey: ["notification-recipients"],
    queryFn: () => apiClient.get<{ clients: Recipient[] }>("/notifications/clients"),
  });
  const historyQuery = useQuery({
    queryKey: ["notification-history"],
    queryFn: () => apiClient.get<{ messages: HistoryMessage[] }>("/notifications/history"),
  });
  const recipients = recipientsQuery.data?.clients ?? [];
  const filteredRecipients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return term ? recipients.filter((item) => item.fullName.toLocaleLowerCase("tr-TR").includes(term)) : recipients;
  }, [recipients, search]);

  const sendMutation = useMutation({
    mutationFn: () => apiClient.post<SendResult>("/notifications/send", { clientIds: selectedIds, message: message.trim() }),
    onSuccess: (result) => {
      toast({
        title: "Mesaj kaydedildi ve gönderim tamamlandı",
        description: `${result.persisted} danışanın gelen kutusuna kaydedildi; ${result.sent} cihaza push gönderildi.`,
      });
      setMessage("");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["notification-history"] });
      setTab("history");
    },
    onError: (error: any) => toast({ title: "Mesaj kaydedilemedi", description: error?.message || "Beklenmeyen bir hata oluştu.", variant: "destructive" }),
  });

  const toggle = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectedDevices = recipients.filter((item) => selectedIds.includes(item.clientId)).reduce((sum, item) => sum + item.subscriptionCount, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-soft text-brand flex items-center justify-center"><BellRing className="h-6 w-6" /></div>
          <div><h1 className="text-2xl sm:text-3xl font-bold">Danışan Bildirimleri</h1><p className="text-muted-foreground text-sm mt-1">Sohbetten ayrı, kalıcı duyuru ve bilgilendirme merkezi</p></div>
        </div>
        <div className="flex gap-2 mt-6 border-b border-border">
          <button onClick={() => setTab("compose")} className={`px-4 py-3 text-sm font-medium border-b-2 ${tab === "compose" ? "border-brand text-brand" : "border-transparent text-muted-foreground"}`}><Send className="inline h-4 w-4 mr-2" />Yeni Bildirim</button>
          <button onClick={() => setTab("history")} className={`px-4 py-3 text-sm font-medium border-b-2 ${tab === "history" ? "border-brand text-brand" : "border-transparent text-muted-foreground"}`}><History className="inline h-4 w-4 mr-2" />Gönderim Geçmişi</button>
        </div>
      </div>

      {tab === "compose" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <section className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b"><h2 className="font-semibold">Mesaj içeriği</h2><p className="text-sm text-muted-foreground mt-1">Başlık: {TITLE}</p></div>
            <div className="p-5 space-y-5">
              <div className="rounded-2xl border bg-gradient-to-br from-brand-soft/70 to-background p-5 shadow-sm">
                <div className="flex items-start gap-3"><div className="rounded-xl bg-brand text-white p-2"><BellRing className="h-5 w-5" /></div><div><div className="font-semibold">{TITLE}</div><p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{message.trim() || "Mesaj önizlemesi burada görünecek."}</p></div></div>
              </div>
              <div><label className="text-sm font-medium mb-2 block">Mesaj</label><Textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} placeholder="Danışanlarınıza iletmek istediğiniz mesajı yazın..." className="min-h-44 resize-y" /><div className="text-xs text-muted-foreground text-right mt-2">{message.length}/500</div></div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">{selectedIds.length}</strong> danışan seçili · {selectedDevices} bağlı cihaz</p>
                <Button onClick={() => sendMutation.mutate()} disabled={!selectedIds.length || !message.trim() || sendMutation.isPending} className="bg-brand-gradient text-white">
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Kaydet ve Gönder
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Cihazı olmayan danışanların mesajları da kalıcı olarak kaydedilir ve uygulamadaki Bildirimler ekranında görünür.</p>
            </div>
          </section>

          <aside className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center"><div><h2 className="font-semibold"><Users className="inline h-4 w-4 mr-2 text-brand" />Danışanlar</h2><p className="text-xs text-muted-foreground mt-1">{recipients.length} portal danışanı</p></div><Button size="sm" variant="outline" onClick={() => setSelectedIds(recipients.map((item) => item.clientId))}>Tümünü Seç</Button></div>
              <div className="relative mt-3"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Danışan ara..." className="w-full pl-9 pr-9 py-2 text-sm rounded-md border bg-background" />{search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1"><X className="h-4 w-4" /></button>}</div>
            </div>
            <div className="max-h-[620px] overflow-y-auto divide-y">
              {recipientsQuery.isLoading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-brand" /></div> : filteredRecipients.map((client) => {
                const selected = selectedIds.includes(client.clientId);
                return <button key={client.clientId} onClick={() => toggle(client.clientId)} className={`w-full text-left p-4 transition ${selected ? "bg-brand-soft" : "hover:bg-muted/40"}`}><div className="flex justify-between gap-3"><div><p className="font-medium text-sm">{client.fullName}</p><p className="text-xs text-muted-foreground mt-1">{client.subscriptionCount ? <><Smartphone className="inline h-3.5 w-3.5 mr-1" />{client.subscriptionCount} cihaz</> : <><UserMinus className="inline h-3.5 w-3.5 mr-1" />Push cihazı yok · yine de kaydedilir</>}</p></div><span className={`h-5 w-5 rounded border flex items-center justify-center ${selected ? "bg-brand border-brand text-white" : "bg-background"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span></div></button>;
              })}
            </div>
          </aside>
        </div>
      ) : (
        <section className="space-y-4">
          {historyQuery.isLoading ? <div className="py-20 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div> : !historyQuery.data?.messages.length ? <div className="border rounded-xl bg-card py-20 text-center text-muted-foreground"><History className="h-10 w-10 mx-auto mb-3 opacity-40" />Henüz gönderilmiş bildirim yok.</div> : historyQuery.data.messages.map((item) => {
            const open = expandedId === item.id;
            return <article key={item.id} className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <button className="w-full p-5 text-left" onClick={() => setExpandedId(open ? null : item.id)}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="font-semibold">{item.title}</h2><span className="text-xs text-muted-foreground">#{item.id}</span></div><p className="text-sm text-muted-foreground mt-2 line-clamp-2 whitespace-pre-wrap">{item.message}</p><p className="text-xs text-muted-foreground mt-3"><Clock3 className="inline h-3.5 w-3.5 mr-1" />{dateTime(item.createdAt)}</p></div><div className="flex items-center gap-2 shrink-0"><Badge variant="outline">{item.summary.total} kişi</Badge><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{item.summary.read} okudu</Badge>{item.summary.notDelivered > 0 && <Badge variant="destructive">{item.summary.notDelivered} ulaşmadı</Badge>}{open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div></div>
              </button>
              {open && <div className="border-t bg-muted/20"><div className="px-5 py-4 border-b bg-background/70"><p className="text-sm whitespace-pre-wrap">{item.message}</p></div><div className="divide-y">{item.recipients.map((recipient) => <div key={recipient.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><p className="text-sm font-medium">{recipient.clientName}</p><p className="text-xs text-muted-foreground mt-1">{recipient.isRead && recipient.readAt ? `${dateTime(recipient.readAt)} tarihinde okudu` : recipient.sentCount ? `${recipient.sentCount}/${recipient.subscriptionCount} cihaza gönderildi` : "Push gönderimi yapılmadı"}</p>{recipient.errorMessage && <p className="text-xs text-destructive mt-1 max-w-2xl truncate" title={recipient.errorMessage}>{recipient.errorMessage}</p>}</div><DeliveryBadge recipient={recipient} /></div>)}</div></div>}
            </article>;
          })}
        </section>
      )}
    </div>
  );
}
