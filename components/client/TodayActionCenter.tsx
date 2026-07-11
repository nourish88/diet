"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  Footprints,
  Loader2,
  MessageCircle,
  Scale,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export interface TodayDiet {
  id: number;
  hedef: string | null;
  su: string | null;
  fizik: string | null;
  tarih: string | null;
  createdAt: string;
  oguns: Array<{ id: number; name: string; time: string }>;
}

export interface TodayProgress {
  id: number;
  date: string;
  weight: number | null;
  waist: number | null;
  bodyFat: number | null;
}

interface TodayActionCenterProps {
  clientId?: number;
  diet: TodayDiet | null;
  checkIn: { id: number; status: string } | null;
  unreadMessages: number;
  progress: { latest: TodayProgress | null; previous: TodayProgress | null };
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function turkeyMinutesNow() {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function TodayActionCenter({
  clientId,
  diet,
  checkIn,
  unreadMessages,
  progress,
}: TodayActionCenterProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoState, setPhotoState] = useState<"idle" | "uploading" | "done">("idle");
  const [photoError, setPhotoError] = useState("");

  const mealState = useMemo(() => {
    const meals = (diet?.oguns ?? [])
      .map((meal) => ({ ...meal, minutes: minutesFromTime(meal.time) }))
      .filter((meal): meal is typeof meal & { minutes: number } => meal.minutes !== null)
      .sort((a, b) => a.minutes - b.minutes);
    const now = turkeyMinutesNow();
    const nextIndex = meals.findIndex((meal) => meal.minutes > now);
    const current = nextIndex === 0 ? null : meals[nextIndex === -1 ? meals.length - 1 : nextIndex - 1] ?? null;
    const next = nextIndex === -1 ? null : meals[nextIndex] ?? null;
    return { current, next, photoMeal: current ?? next ?? meals[0] ?? null };
  }, [diet]);

  const weightChange =
    progress.latest?.weight != null && progress.previous?.weight != null
      ? progress.latest.weight - progress.previous.weight
      : null;

  const uploadPhoto = async (file?: File) => {
    if (!file || !diet || !clientId || !mealState.photoMeal) return;
    setPhotoError("");
    setPhotoState("uploading");
    try {
      const imageData = await readAsDataUrl(file);
      await apiClient.post("/meal-photos", {
        imageData,
        dietId: diet.id,
        ogunId: mealState.photoMeal.id,
        clientId,
      });
      setPhotoState("done");
      window.setTimeout(() => setPhotoState("idle"), 3000);
    } catch (error) {
      setPhotoState("idle");
      setPhotoError(error instanceof Error ? error.message : "Fotoğraf gönderilemedi.");
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b bg-brand-soft/35 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold">Bugün</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Günlük planınız tek ekranda</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
          <Target className="h-5 w-5" />
        </div>
      </div>

      <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="divide-y">
          <Link href={diet ? `/client/diets/${diet.id}` : "/client/diets"} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40 sm:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><UtensilsCrossed className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{mealState.current ? `Şimdi: ${mealState.current.name}` : "Sıradaki öğününüz"}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {mealState.next ? `Sonraki: ${mealState.next.name} · ${mealState.next.time}` : mealState.current ? `${mealState.current.time} · Günün son planlı öğünü` : "Öğün planınızı görüntüleyin"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>

          <div className="flex items-center gap-3 p-4 sm:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"><Droplets className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold">Bugünkü su hedefi</p><p className="mt-1 text-xs text-muted-foreground">{diet?.su || "Gün boyunca düzenli aralıklarla su için."}</p></div>
          </div>

          <div className="flex items-center gap-3 p-4 sm:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Footprints className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold">Bugünkü hareket hedefi</p><p className="mt-1 text-xs text-muted-foreground">{diet?.fizik || "Hareket planınızı diyetisyeninizle belirleyin."}</p></div>
          </div>
        </div>

        <div className="divide-y">
          {checkIn?.status === "pending" ? (
            <Link href={`/client/check-in/${checkIn.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-amber-50/60 sm:px-5 dark:hover:bg-amber-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><ClipboardCheck className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Haftalık kontrolünüz hazır</p><p className="mt-1 text-xs text-muted-foreground">Kısa değerlendirmeyi tamamlayın.</p></div><ChevronRight className="h-4 w-4 text-brand" />
            </Link>
          ) : (
            <div className="flex items-center gap-3 p-4 sm:px-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><ClipboardCheck className="h-5 w-5" /></div><div><p className="text-sm font-semibold">Haftalık kontrol</p><p className="mt-1 text-xs text-muted-foreground">{checkIn?.status === "submitted" ? "Bu haftaki kontrol tamamlandı." : "Yeni kontrol zamanı geldiğinde haber vereceğiz."}</p></div></div>
          )}

          <Link href="/client/conversations" className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40 sm:px-5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><MessageCircle className="h-5 w-5" />{unreadMessages > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card bg-destructive" />}</div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Diyetisyeninizden mesajlar</p><p className="mt-1 text-xs text-muted-foreground">{unreadMessages > 0 ? `${unreadMessages} okunmamış mesajınız var.` : "Yeni mesajınız bulunmuyor."}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/client/progress" className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40 sm:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Scale className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Son gelişim özeti</p><p className="mt-1 text-xs text-muted-foreground">{progress.latest?.weight != null ? `${progress.latest.weight.toLocaleString("tr-TR")} kg${weightChange != null ? ` · Önceki ölçüme göre ${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg` : ""}` : "İlk ölçümünüzü ekleyin."}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <div className="p-4 sm:px-5">
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void uploadPhoto(event.target.files?.[0])} />
            <button type="button" disabled={!diet || !mealState.photoMeal || photoState === "uploading"} onClick={() => photoInputRef.current?.click()} className="flex w-full items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">{photoState === "uploading" ? <Loader2 className="h-5 w-5 animate-spin" /> : photoState === "done" ? <Check className="h-5 w-5" /> : <Camera className="h-5 w-5" />}</div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{photoState === "done" ? "Fotoğraf gönderildi" : "Öğün fotoğrafı gönder"}</p><p className="mt-1 text-xs text-muted-foreground">{mealState.photoMeal ? `${mealState.photoMeal.name} öğününe eklenecek.` : "Aktif bir öğün planı bulunamadı."}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            {photoError && <p className="mt-2 text-xs text-destructive">{photoError}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
