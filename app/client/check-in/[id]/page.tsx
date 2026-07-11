"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Send,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const SCORE_FIELDS = [
  { key: "adherence", label: "Programa uyumum", low: "Zorlandım", high: "Çok iyiydi" },
  { key: "hunger", label: "Açlık kontrolüm", low: "Çok zordu", high: "Çok rahattı" },
  { key: "energy", label: "Enerji düzeyim", low: "Çok düşüktü", high: "Çok iyiydi" },
  { key: "sleep", label: "Uyku kalitem", low: "Çok kötüydü", high: "Çok iyiydi" },
  { key: "water", label: "Su tüketimim", low: "Yetersizdi", high: "Hedefimdeydi" },
  { key: "exercise", label: "Hareket düzeyim", low: "Çok azdı", high: "Çok iyiydi" },
] as const;

type ScoreKey = (typeof SCORE_FIELDS)[number]["key"];
type FormState = Record<ScoreKey, number | null> & {
  challenge: string;
  supportRequest: string;
};

type CheckIn = {
  id: number;
  weekStart: string;
  status: string;
  submittedAt: string | null;
};

const EMPTY_FORM: FormState = {
  adherence: null,
  hunger: null,
  energy: null,
  sleep: null,
  water: null,
  exercise: null,
  challenge: "",
  supportRequest: "",
};

function ScoreField({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (score: number) => void;
}) {
  return (
    <fieldset className="rounded-2xl border bg-card p-4 sm:p-5">
      <legend className="px-1 text-sm sm:text-base font-semibold">{label}</legend>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            aria-label={`${label}: ${score}`}
            aria-pressed={value === score}
            onClick={() => onChange(score)}
            className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
              value === score
                ? "border-brand bg-brand text-white shadow-sm"
                : "bg-background hover:border-brand/50 hover:bg-brand-soft"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

export default function WeeklyCheckInPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const checkInQuery = useQuery({
    queryKey: ["client-check-in", params.id],
    queryFn: () =>
      apiClient.get<{ checkIn: CheckIn }>(`/client/check-ins/${params.id}`),
    enabled: Boolean(params.id),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>(`/client/check-ins/${params.id}`, {
        ...form,
      }),
    onSuccess: (result) => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["client-current-check-in"] });
      queryClient.invalidateQueries({ queryKey: ["client-notifications"] });
      toast({ title: "Teşekkür ederiz", description: result.message });
    },
    onError: (error: Error) =>
      toast({
        title: "Form gönderilemedi",
        description: error.message || "Lütfen tekrar deneyin.",
        variant: "destructive",
      }),
  });

  const allScoresCompleted = SCORE_FIELDS.every(
    ({ key }) => form[key] !== null,
  );
  const alreadySubmitted = checkInQuery.data?.checkIn.status === "submitted";

  if (checkInQuery.isLoading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (checkInQuery.isError || !checkInQuery.data) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border bg-card p-8 text-center">
        <h1 className="font-semibold text-lg">Kontrol formu bulunamadı</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Bağlantı size ait olmayabilir veya form artık kullanılamıyor olabilir.
        </p>
        <Link href="/client" className="inline-flex mt-5 text-brand font-medium">
          <ArrowLeft className="h-4 w-4 mr-2" /> Ana sayfaya dön
        </Link>
      </div>
    );
  }

  if (submitted || alreadySubmitted) {
    return (
      <div className="max-w-xl mx-auto min-h-[60vh] flex items-center">
        <div className="w-full rounded-3xl border bg-card p-7 sm:p-10 text-center shadow-xl shadow-black/5">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mt-6">Teşekkür ederiz</h1>
          <p className="text-muted-foreground mt-3 leading-7">
            Haftalık değerlendirmeniz diyetisyeninize iletildi. Paylaştığınız
            bilgiler bir sonraki planınız hazırlanırken dikkate alınacak.
          </p>
          <Button asChild className="mt-7">
            <Link href="/client">Ana sayfaya dön</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Link
        href="/client"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Ana sayfaya dön
      </Link>

      <div className="rounded-3xl bg-gradient-to-br from-brand via-brand/90 to-emerald-600 text-white p-6 sm:p-8 shadow-xl shadow-brand/10">
        <HeartHandshake className="h-9 w-9" />
        <h1 className="text-2xl sm:text-3xl font-bold mt-4">Haftalık kontrol</h1>
        <p className="text-white/85 mt-2 leading-6">
          Geçen haftanın nasıl geçtiğini paylaşın. Doğru ya da yanlış cevap
          yok; dürüst yanıtlarınız size daha iyi destek olmamızı sağlar.
        </p>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (allScoresCompleted) submitMutation.mutate();
        }}
      >
        {SCORE_FIELDS.map((field) => (
          <ScoreField
            key={field.key}
            label={field.label}
            low={field.low}
            high={field.high}
            value={form[field.key]}
            onChange={(score) =>
              setForm((current) => ({ ...current, [field.key]: score }))
            }
          />
        ))}

        <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-5">
          <div>
            <label className="text-sm font-semibold block mb-2" htmlFor="challenge">
              Bu hafta en çok zorlandığınız konu neydi?
            </label>
            <Textarea
              id="challenge"
              value={form.challenge}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  challenge: event.target.value.slice(0, 1000),
                }))
              }
              placeholder="İsterseniz birkaç cümleyle paylaşabilirsiniz."
              className="min-h-24"
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2" htmlFor="supportRequest">
              Diyetisyeninizden nasıl bir destek beklersiniz?
            </label>
            <Textarea
              id="supportRequest"
              value={form.supportRequest}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  supportRequest: event.target.value.slice(0, 1000),
                }))
              }
              placeholder="Eklemek istediğiniz bir not varsa yazabilirsiniz."
              className="min-h-24"
            />
          </div>
        </div>

        {!allScoresCompleted && (
          <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
            Göndermeden önce tüm puanlama sorularını yanıtlayın.
          </p>
        )}
        <Button
          type="submit"
          disabled={!allScoresCompleted || submitMutation.isPending}
          className="w-full h-12 text-base bg-brand-gradient text-white"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Send className="h-5 w-5 mr-2" />
          )}
          Yanıtlarımı Gönder
        </Button>
      </form>
    </div>
  );
}
