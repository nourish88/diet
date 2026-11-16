"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserRoundPen } from "lucide-react";
import ClientSelector from "@/components/ClientSelector";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";

interface Props {
  dietId: number;
  client: { id: number; name: string; surname: string };
}

export function ReassignDietDialog({ dietId, client }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Props["client"] | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: (clientId: number) => apiClient.patch(`/diets/${dietId}/reassign`, {
      clientId,
      previousClientId: client.id,
    }),
    onSuccess: () => {
      // Detail, both clients' histories and the latest-program controls must
      // refresh together when ownership changes.
      for (const key of ["diet", "diets", "client", "clients", "dashboard", "latestDietForNotify", "client-portal-overview"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      setOpen(false);
      toast({ title: "Danışan değiştirildi", description: `Program ${target?.name} ${target?.surname} adlı danışana taşındı.` });
    },
  });

  const changeOpen = (next: boolean) => {
    if (mutation.isPending) return;
    setOpen(next);
    setTarget(null);
    mutation.reset();
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserRoundPen className="mr-2 h-4 w-4" />
          Danışanı Değiştir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Program #{dietId} için danışanı değiştir</DialogTitle>
          <DialogDescription>
            Program {client.name} {client.surname} adlı danışandan kaldırılıp
            seçeceğiniz danışana taşınacak. Öğünler ve program tarihi korunur;
            hedef danışanın diğer programları da saklanır.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={mutation.isPending} className="space-y-4 min-w-0">
          <ClientSelector
            selectedClientId={target?.id ?? null}
            selectedClientName={target ? `${target.name} ${target.surname} (#${target.id})` : undefined}
            onSelectClient={(_id, selected) => {
              setTarget(selected ?? null);
              mutation.reset();
            }}
          />
          {target && (
            <p className="text-sm" aria-live="polite">
              Yeni danışan: <strong>{target.name} {target.surname} (#{target.id})</strong>
            </p>
          )}
          {target?.id === client.id && <p className="text-sm text-destructive">Farklı bir danışan seçin.</p>}
          <p className="text-sm text-muted-foreground">
            Eski paylaşım bağlantıları iptal edilir. Mesaj veya öğün fotoğrafı
            bulunan programlar, danışana özel kayıtları korumak için taşınamaz.
          </p>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Danışan değiştirilemedi. Tekrar deneyin."}
            </p>
          )}
        </fieldset>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={mutation.isPending} onClick={() => changeOpen(false)}>Vazgeç</Button>
          <Button
            disabled={!target || target.id === client.id || mutation.isPending}
            onClick={() => target && mutation.mutate(target.id)}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Seçilen Danışana Taşı
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
