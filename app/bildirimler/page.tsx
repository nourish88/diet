"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BellRing,
  Check,
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

type Recipient = {
  clientId: number;
  fullName: string;
  userId: number | null;
  subscriptionCount: number;
  dietUpdatesEnabled: boolean;
};

type RecipientsResponse = {
  clients: Recipient[];
};

type SendResult = {
  sent: number;
  failed: number;
  skipped: number;
  clients: number;
};

const TITLE = "Diyetisyeninizden mesaj var";

export default function NotificationsPage() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["notification-recipients"],
    queryFn: () => apiClient.get<RecipientsResponse>("/notifications/clients"),
  });

  const recipients = data?.clients ?? [];
  const deliverableRecipients = recipients.filter(
    (client) => client.subscriptionCount > 0
  );

  const filteredRecipients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    if (!term) return recipients;
    return recipients.filter((client) =>
      client.fullName.toLocaleLowerCase("tr-TR").includes(term)
    );
  }, [recipients, search]);

  const selectedRecipients = useMemo(
    () => recipients.filter((client) => selectedIds.includes(client.clientId)),
    [recipients, selectedIds]
  );

  const sendMutation = useMutation({
    mutationFn: () =>
      apiClient.post<SendResult>("/notifications/send", {
        clientIds: selectedIds,
        message: message.trim(),
      }),
    onSuccess: (result) => {
      toast({
        title: "Bildirim gönderildi",
        description: `${result.sent} cihaza gönderildi. ${result.failed} hata, ${result.skipped} atlanan danışan.`,
      });
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Bildirim gönderilemedi",
        description: error?.message || "Beklenmeyen bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const toggleRecipient = (client: Recipient) => {
    if (client.subscriptionCount === 0) return;
    setSelectedIds((current) =>
      current.includes(client.clientId)
        ? current.filter((id) => id !== client.clientId)
        : [...current, client.clientId]
    );
  };

  const selectAllDeliverable = () => {
    setSelectedIds(deliverableRecipients.map((client) => client.clientId));
  };

  const canSend =
    selectedIds.length > 0 && message.trim().length > 0 && !sendMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Bildirimler
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Bağlı cihazlara danışan seçerek anlık mesaj gönderin
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Smartphone className="h-4 w-4 mr-2" />
          )}
          Cihazları Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <section className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Yeni Mesaj</h2>
              <p className="text-sm text-muted-foreground">
                Başlık otomatik: {TITLE}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Bildirim Önizlemesi
              </div>
              <div className="font-medium text-foreground">{TITLE}</div>
              <div className="text-sm text-muted-foreground mt-1 min-h-5">
                {message.trim() || "Mesajınızı yazınca burada görünecek."}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Mesaj
              </label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 500))}
                placeholder="Danışanlara göndermek istediğiniz mesajı yazın..."
                className="min-h-44 resize-y"
              />
              <div className="mt-2 text-xs text-muted-foreground text-right">
                {message.length}/500
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedIds.length} danışan seçili, toplam{" "}
                {selectedRecipients.reduce(
                  (sum, client) => sum + client.subscriptionCount,
                  0
                )}{" "}
                cihaz
              </div>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!canSend}
                className="bg-brand-gradient hover:opacity-90 text-white"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Gönder
              </Button>
            </div>
          </div>
        </section>

        <aside className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand" />
                  Danışanlar
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {deliverableRecipients.length}/{recipients.length} danışanda aktif cihaz var
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllDeliverable}
                disabled={deliverableRecipients.length === 0}
              >
                Tümünü Seç
              </Button>
            </div>
            <div className="relative mt-3">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Danışan ara..."
                className="w-full pl-9 pr-9 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                  aria-label="Aramayı temizle"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Danışan bulunamadı
              </div>
            ) : (
              filteredRecipients.map((client) => {
                const selected = selectedIds.includes(client.clientId);
                const disabled = client.subscriptionCount === 0;
                return (
                  <button
                    key={client.clientId}
                    type="button"
                    onClick={() => toggleRecipient(client)}
                    disabled={disabled}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selected
                        ? "bg-brand-soft"
                        : disabled
                        ? "bg-muted/20 opacity-60"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {client.fullName}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {disabled ? (
                            <>
                              <UserMinus className="h-3.5 w-3.5" />
                              Aktif cihaz yok
                            </>
                          ) : (
                            <>
                              <Smartphone className="h-3.5 w-3.5" />
                              {client.subscriptionCount} cihaz bağlı
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          selected
                            ? "bg-brand border-brand text-white"
                            : "border-border bg-background"
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
