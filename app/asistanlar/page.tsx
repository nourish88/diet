"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Plus, UserPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";

interface AssistantPermissions {
  notifications?: { birthdayReminders?: boolean };
}

interface AssistantRow {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  permissions: AssistantPermissions;
}

export default function AsistanlarPage() {
  const { databaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assistants, setAssistants] = useState<AssistantRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiClient.get<{ assistants: AssistantRow[] }>(
        "/assistants",
      );
      setAssistants(data.assistants || []);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Asistanlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!databaseUser) {
      router.push("/account");
      return;
    }
    if (databaseUser.role !== "dietitian") {
      router.push("/");
      return;
    }
    load();
  }, [authLoading, databaseUser, router, load]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast({
        title: "Eksik bilgi",
        description: "Ad, e-posta ve şifre zorunlu.",
        variant: "destructive",
      });
      return;
    }
    if (form.password.length < 6) {
      toast({
        title: "Şifre kısa",
        description: "Şifre en az 6 karakter olmalı.",
        variant: "destructive",
      });
      return;
    }
    if (form.password !== form.confirm) {
      toast({
        title: "Şifreler eşleşmiyor",
        description: "Lütfen şifreyi doğru tekrar girin.",
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      const data = await apiClient.post<{ assistant: AssistantRow }>(
        "/assistants",
        {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        },
      );
      setAssistants((prev) => [...prev, data.assistant]);
      setAddOpen(false);
      setForm({ name: "", email: "", password: "", confirm: "" });
      toast({
        title: "Asistan oluşturuldu",
        description: `${data.assistant.email} kullanıcıya bildirin.`,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Asistan oluşturulamadı.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const toggleBirthdayPermission = async (
    assistant: AssistantRow,
    enabled: boolean,
  ) => {
    setBusyId(assistant.id);
    try {
      const data = await apiClient.patch<{ permissions: AssistantPermissions }>(
        `/assistants/${assistant.id}`,
        { permissions: { notifications: { birthdayReminders: enabled } } },
      );
      setAssistants((prev) =>
        prev.map((a) =>
          a.id === assistant.id ? { ...a, permissions: data.permissions } : a,
        ),
      );
    } catch (error) {
      toast({
        title: "Güncellenemedi",
        description: "İzin değiştirilemedi.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (assistant: AssistantRow) => {
    const ok = window.confirm(
      `${assistant.email} silinecek. Emin misiniz?`,
    );
    if (!ok) return;
    setBusyId(assistant.id);
    try {
      await apiClient.delete(`/assistants/${assistant.id}`);
      setAssistants((prev) => prev.filter((a) => a.id !== assistant.id));
      toast({ title: "Silindi", description: `${assistant.email} kaldırıldı.` });
    } catch (error) {
      toast({
        title: "Silinemedi",
        description: "Asistan silinirken hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Asistanlarım</h1>
          <p className="text-sm text-muted-foreground">
            Asistanlarınız sizin PWA'nızı görür. Şimdilik yalnızca doğum günü
            bildirimleri yönlendirmesi etkin; diğer izinler ileride eklenecek.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Asistan Ekle
        </Button>
      </div>

      {assistants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserPlus className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Henüz asistanınız yok. "Asistan Ekle" ile başlayın.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assistants.map((a) => {
            const birthdayOn =
              a.permissions?.notifications?.birthdayReminders === true;
            return (
              <Card key={a.id}>
                <CardContent className="space-y-4 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{a.name || "İsimsiz"}</div>
                      <div className="text-sm text-muted-foreground">
                        {a.email}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(a)}
                      disabled={busyId === a.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          Doğum günü bildirimleri
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Açıkken danışan doğum günleri size değil, bu asistana
                          gönderilir.
                        </div>
                      </div>
                      <Switch
                        checked={birthdayOn}
                        disabled={busyId === a.id}
                        onCheckedChange={(v) =>
                          toggleBirthdayPermission(a, v === true)
                        }
                      />
                    </div>

                    <PlaceholderRow
                      label="Danışanlar (read-write)"
                      hint="Asistan şimdilik tüm danışanlarınızı görüp düzenleyebiliyor."
                    />
                    <PlaceholderRow
                      label="Diyetler (read-write)"
                      hint="İleride sayfa-sayfa izin verilebilecek."
                    />
                    <PlaceholderRow
                      label="Sohbetler (read-write)"
                      hint="İleride sayfa-sayfa izin verilebilecek."
                    />
                    <PlaceholderRow
                      label="Mesaj bildirimleri"
                      hint="İleride bildirim türü bazında seçilebilecek."
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Asistan</DialogTitle>
            <DialogDescription>
              Asistan, sizin PWA'nızda oturum açar ve verilerinize sizin gibi
              erişir. Şifreyi asistanla paylaşmanız gerekir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="asst-name">Ad</Label>
              <Input
                id="asst-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="asst-email">E-posta</Label>
              <Input
                id="asst-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="asst-pass">Şifre</Label>
              <Input
                id="asst-pass"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="asst-pass2">Şifre (Tekrar)</Label>
              <Input
                id="asst-pass2"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlaceholderRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between opacity-70">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Lock className="h-3 w-3 text-muted-foreground" />
          {label}
          <Badge variant="secondary" className="text-[10px]">
            Yakında
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked disabled />
    </div>
  );
}
