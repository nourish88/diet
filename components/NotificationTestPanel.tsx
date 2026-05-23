"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Loader2,
  Utensils,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export type NotificationTestPanelOgun = {
  id: number;
  name: string;
  time: string | null;
};

interface NotificationTestPanelProps {
  dietId: number | null;
  oguns: NotificationTestPanelOgun[];
  /**
   * Visual variant.
   * - "card": standalone card (used on client detail page)
   * - "compact": denser layout meant to sit under the diet form
   */
  variant?: "card" | "compact";
  /** Override title; defaults to "Bildirim Testleri". */
  title?: string;
  className?: string;
}

type SubscriptionStatus = {
  loading: boolean;
  hasUser: boolean;
  subscriptionCount: number;
  dietUpdatesEnabled: boolean;
  mealRemindersEnabled: boolean;
  error: string | null;
};

const initialStatus: SubscriptionStatus = {
  loading: true,
  hasUser: false,
  subscriptionCount: 0,
  dietUpdatesEnabled: true,
  mealRemindersEnabled: true,
  error: null,
};

const COOLDOWN_MS = 1500;

type NotifyResponse = {
  ok: boolean;
  sent?: number;
  failed?: number;
  code?: string;
  message?: string;
  error?: string;
};

export function NotificationTestPanel({
  dietId,
  oguns,
  variant = "card",
  title = "Bildirim Testleri",
  className,
}: NotificationTestPanelProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus>(initialStatus);
  const [isSendingDiet, setIsSendingDiet] = useState(false);
  const [isSendingMeal, setIsSendingMeal] = useState(false);
  const [selectedOgunId, setSelectedOgunId] = useState<string>("");
  const [lastSentLabel, setLastSentLabel] = useState<string | null>(null);

  // Auto-select first ogun when the list changes.
  useEffect(() => {
    if (oguns.length === 0) {
      setSelectedOgunId("");
      return;
    }
    setSelectedOgunId((current) => {
      if (current && oguns.some((o) => String(o.id) === current)) {
        return current;
      }
      return String(oguns[0].id);
    });
  }, [oguns]);

  const loadStatus = useCallback(async () => {
    if (!dietId) {
      setStatus({ ...initialStatus, loading: false });
      return;
    }
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiClient.get<{
        ok: boolean;
        hasUser: boolean;
        subscriptionCount: number;
        dietUpdatesEnabled: boolean;
        mealRemindersEnabled: boolean;
      }>(`/diets/${dietId}/notify`);
      setStatus({
        loading: false,
        hasUser: Boolean(data?.hasUser),
        subscriptionCount: data?.subscriptionCount ?? 0,
        dietUpdatesEnabled: data?.dietUpdatesEnabled ?? true,
        mealRemindersEnabled: data?.mealRemindersEnabled ?? true,
        error: null,
      });
    } catch (error: any) {
      setStatus({
        ...initialStatus,
        loading: false,
        error: error?.message || "Abonelik durumu alınamadı",
      });
    }
  }, [dietId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSendDietNotification = async () => {
    if (!dietId || isSendingDiet) return;
    setIsSendingDiet(true);
    try {
      const data = await apiClient.post<NotifyResponse>(
        `/diets/${dietId}/notify`,
        { type: "new-diet" }
      );
      if (data.ok) {
        toast({
          title: "Bildirim gönderildi",
          description: `Diyet bildirimi ${data.sent ?? 0} cihaza iletildi.`,
        });
        setLastSentLabel(`Diyet bildirimi · ${formatNow()}`);
      } else {
        toast({
          title: "Bildirim gönderilemedi",
          description: data.message || data.error || "Bilinmeyen hata",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Bildirim gönderilemedi",
        description:
          error?.details ||
          error?.message ||
          "Sunucu ile iletişimde hata oluştu.",
        variant: "destructive",
      });
    } finally {
      // brief cooldown to prevent accidental double-tap
      setTimeout(() => setIsSendingDiet(false), COOLDOWN_MS);
    }
  };

  const handleSendMealReminder = async () => {
    if (!dietId || isSendingMeal) return;
    const ogunId = Number.parseInt(selectedOgunId, 10);
    if (!Number.isInteger(ogunId) || ogunId <= 0) {
      toast({
        title: "Öğün seçilmedi",
        description: "Lütfen göndermek istediğiniz öğünü seçin.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingMeal(true);
    try {
      const data = await apiClient.post<NotifyResponse>(
        `/diets/${dietId}/notify`,
        { type: "meal-reminder", ogunId }
      );
      if (data.ok) {
        const selectedOgun = oguns.find((o) => o.id === ogunId);
        toast({
          title: "Öğün hatırlatıcısı gönderildi",
          description: `${selectedOgun?.name ?? "Öğün"} hatırlatıcısı ${
            data.sent ?? 0
          } cihaza iletildi.`,
        });
        setLastSentLabel(
          `${selectedOgun?.name ?? "Öğün"} hatırlatıcısı · ${formatNow()}`
        );
      } else {
        toast({
          title: "Hatırlatıcı gönderilemedi",
          description: data.message || data.error || "Bilinmeyen hata",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Hatırlatıcı gönderilemedi",
        description:
          error?.details ||
          error?.message ||
          "Sunucu ile iletişimde hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsSendingMeal(false), COOLDOWN_MS);
    }
  };

  const dietButtonDisabled =
    !dietId ||
    status.loading ||
    isSendingDiet ||
    status.subscriptionCount === 0;
  const mealButtonDisabled =
    !dietId ||
    status.loading ||
    isSendingMeal ||
    oguns.length === 0 ||
    !selectedOgunId ||
    status.subscriptionCount === 0;

  const dietDisabledHint = useMemo(() => {
    if (!dietId) return "Bildirimi göndermek için önce diyeti kaydedin.";
    if (status.loading) return "Abonelik durumu kontrol ediliyor…";
    if (!status.hasUser)
      return "Danışan bu özelliği kullanmak için hesap açmamış.";
    if (status.subscriptionCount === 0)
      return "Danışan henüz bildirim aboneliği yapmamış.";
    if (!status.dietUpdatesEnabled)
      return "Danışan diyet bildirimlerini kapatmış (yine de manuel test gönderilebilir).";
    return null;
  }, [dietId, status]);

  const mealDisabledHint = useMemo(() => {
    if (!dietId) return "Önce diyeti kaydedin.";
    if (status.loading) return "Abonelik durumu kontrol ediliyor…";
    if (oguns.length === 0) return "Bu diyette tetiklenebilecek öğün yok.";
    if (status.subscriptionCount === 0)
      return "Danışan henüz bildirim aboneliği yapmamış.";
    if (!selectedOgunId) return "Önce bir öğün seçin.";
    if (!status.mealRemindersEnabled)
      return "Danışan öğün hatırlatıcılarını kapatmış (yine de manuel test gönderilebilir).";
    return null;
  }, [dietId, status, oguns.length, selectedOgunId]);

  const isCompact = variant === "compact";

  const container = (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-sm",
        isCompact ? "p-3 sm:p-4" : "p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BellRing
            className={cn(
              "shrink-0 text-brand",
              isCompact ? "h-4 w-4" : "h-5 w-5"
            )}
          />
          <h3
            className={cn(
              "font-semibold text-foreground truncate",
              isCompact ? "text-sm" : "text-base"
            )}
          >
            {title}
          </h3>
        </div>
        <SubscriptionBadge status={status} />
      </div>

      <p
        className={cn(
          "text-muted-foreground mb-4 flex items-start gap-1.5",
          isCompact ? "text-xs" : "text-sm"
        )}
      >
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Bu butonlar danışanın cihazına gerçek bildirim gönderir. Danışan
          yanınızdayken bildirimin ulaşıp ulaşmadığını doğrulamak için
          kullanın.
        </span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Diet notification */}
        <div className="rounded-md border border-border p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-brand" />
            <span className="text-sm font-medium text-foreground">
              Diyet bildirimi
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            “Yeni diyet programınız hazır” bildirimi gönderir.
          </p>
          <Button
            type="button"
            onClick={handleSendDietNotification}
            disabled={dietButtonDisabled}
            aria-disabled={dietButtonDisabled}
            title={dietDisabledHint ?? undefined}
            className="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            size={isCompact ? "sm" : "default"}
          >
            {isSendingDiet ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gönderiliyor…
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Diyet bildirimi gönder
              </>
            )}
          </Button>
          {dietDisabledHint && (
            <p className="text-[11px] text-muted-foreground mt-2 leading-tight">
              {dietDisabledHint}
            </p>
          )}
        </div>

        {/* Meal reminder */}
        <div className="rounded-md border border-border p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Utensils className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-foreground">
              Öğün hatırlatıcısı
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Bir öğün seçin; o öğünün hatırlatıcısı anında gönderilir.
          </p>
          <select
            value={selectedOgunId}
            onChange={(e) => setSelectedOgunId(e.target.value)}
            disabled={oguns.length === 0 || !dietId}
            className={cn(
              "w-full text-sm rounded-md border border-border px-2 py-2 mb-3 bg-card",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
              "disabled:bg-muted/30 disabled:text-muted-foreground/70"
            )}
            aria-label="Öğün seçin"
          >
            {oguns.length === 0 && <option value="">Öğün bulunamadı</option>}
            {oguns.map((ogun) => (
              <option key={ogun.id} value={ogun.id}>
                {ogun.time ? `${ogun.time} — ${ogun.name}` : ogun.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={handleSendMealReminder}
            disabled={mealButtonDisabled}
            aria-disabled={mealButtonDisabled}
            title={mealDisabledHint ?? undefined}
            variant="outline"
            className="mt-auto w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            size={isCompact ? "sm" : "default"}
          >
            {isSendingMeal ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gönderiliyor…
              </>
            ) : (
              <>
                <Utensils className="h-4 w-4 mr-2" />
                Hatırlatıcıyı gönder
              </>
            )}
          </Button>
          {mealDisabledHint && (
            <p className="text-[11px] text-muted-foreground mt-2 leading-tight">
              {mealDisabledHint}
            </p>
          )}
        </div>
      </div>

      {lastSentLabel && (
        <p className="mt-3 text-[11px] text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Son gönderim: {lastSentLabel}
        </p>
      )}
    </div>
  );

  return container;
}

function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  if (status.loading) {
    return (
      <span className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Kontrol ediliyor
      </span>
    );
  }
  if (status.error) {
    return (
      <span
        className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive"
        title={status.error}
      >
        <AlertCircle className="h-3 w-3" /> Hata
      </span>
    );
  }
  if (status.subscriptionCount === 0) {
    return (
      <span className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-foreground">
        <AlertCircle className="h-3 w-3" /> Abonelik yok
      </span>
    );
  }
  return (
    <span className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      {status.subscriptionCount} cihaz aboneli
    </span>
  );
}

function formatNow(): string {
  const d = new Date();
  return d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default NotificationTestPanel;
