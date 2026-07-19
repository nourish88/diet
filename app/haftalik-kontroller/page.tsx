"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DeliveryStatus =
  | "delivered"
  | "sent"
  | "partial"
  | "not_subscribed"
  | "preference_disabled"
  | "failed"
  | "push_unavailable"
  | "pending"
  | "not_created";

type WeekSummary = {
  weekStart: string;
  total: number;
  sent: number;
  read: number;
  submitted: number;
};

type CheckInRow = {
  id: number;
  client: { id: number; name: string; surname: string };
  status: string;
  sentAt: string | null;
  reminderSentAt: string | null;
  submittedAt: string | null;
  contactedAt: string | null;
  readAt: string | null;
  deliveryStatus: DeliveryStatus;
  initialNotification: {
    createdAt: string;
    subscriptionCount: number;
    sentCount: number;
    failedCount: number;
    pushSentAt: string | null;
    deliveredAt: string | null;
    errorMessage: string | null;
  } | null;
  reminderNotification: {
    createdAt: string;
    sentCount: number;
    deliveredAt: string | null;
  } | null;
  answers: {
    adherence: number | null;
    hunger: number | null;
    energy: number | null;
    sleep: number | null;
    water: number | null;
    exercise: number | null;
    challenge: string | null;
    supportRequest: string | null;
  } | null;
};

type OverviewResponse = {
  weeks: WeekSummary[];
  selectedWeek: string | null;
  summary: {
    total: number;
    sent: number;
    pushDelivered: number;
    read: number;
    submitted: number;
    reminded: number;
    failed: number;
  } | null;
  checkIns: CheckInRow[];
};

type Filter = "all" | "submitted" | "waiting" | "unread" | "failed";

type ScoreKey =
  | "adherence"
  | "hunger"
  | "energy"
  | "sleep"
  | "water"
  | "exercise";

const SCORE_LABELS: Array<[ScoreKey, string]> = [
  ["adherence", "Uyum"],
  ["hunger", "Açlık"],
  ["energy", "Enerji"],
  ["sleep", "Uyku"],
  ["water", "Su"],
  ["exercise", "Hareket"],
];

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function formatWeek(value: string) {
  const start = new Date(`${value}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const startText = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(start);
  const endText = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(end);
  return `${startText} – ${endText}`;
}

function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "slate" | "blue";
  children: ReactNode;
}) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function DeliveryPill({ row }: { row: CheckInRow }) {
  if (!row.sentAt || row.deliveryStatus === "not_created") {
    return <StatusPill tone="red">Gönderilmedi</StatusPill>;
  }
  if (row.deliveryStatus === "delivered") {
    return <StatusPill tone="green">Cihaza ulaştı</StatusPill>;
  }
  if (row.deliveryStatus === "sent") {
    return <StatusPill tone="blue">Push gönderildi</StatusPill>;
  }
  if (row.deliveryStatus === "partial") {
    return <StatusPill tone="amber">Kısmen gönderildi</StatusPill>;
  }
  if (row.deliveryStatus === "not_subscribed") {
    return <StatusPill tone="amber">Push aboneliği yok</StatusPill>;
  }
  if (row.deliveryStatus === "preference_disabled") {
    return <StatusPill tone="amber">Bildirim kapalı</StatusPill>;
  }
  if (row.deliveryStatus === "failed") {
    return <StatusPill tone="red">Push hatası</StatusPill>;
  }
  if (row.deliveryStatus === "push_unavailable") {
    return <StatusPill tone="amber">Push kullanılamıyor</StatusPill>;
  }
  return <StatusPill tone="slate">Bekleniyor</StatusPill>;
}

export default function WeeklyCheckInsPage() {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["weekly-check-in-overview", selectedWeek],
    queryFn: () =>
      apiClient.get<OverviewResponse>(
        `/check-ins/weekly-overview${selectedWeek ? `?weekStart=${selectedWeek}` : ""}`,
        { cache: "no-store" },
      ),
  });

  const data = query.data;
  const activeWeek = selectedWeek ?? data?.selectedWeek ?? "";
  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    return (data?.checkIns ?? []).filter((row) => {
      const fullName = `${row.client.name} ${row.client.surname}`.toLocaleLowerCase("tr-TR");
      if (normalizedSearch && !fullName.includes(normalizedSearch)) return false;
      if (filter === "submitted") return row.status === "submitted";
      if (filter === "waiting") return row.status !== "submitted";
      if (filter === "unread") return !row.readAt;
      if (filter === "failed") {
        return (
          !row.sentAt ||
          [
            "failed",
            "partial",
            "not_subscribed",
            "preference_disabled",
            "push_unavailable",
          ].includes(row.deliveryStatus)
        );
      }
      return true;
    });
  }, [data?.checkIns, filter, search]);

  const summaryCards = data?.summary
    ? [
        { label: "Toplam danışan", value: data.summary.total, icon: Users },
        { label: "Form gönderildi", value: data.summary.sent, icon: Send },
        {
          label: "Cihaza ulaştı",
          value: data.summary.pushDelivered,
          icon: BellRing,
        },
        { label: "Okundu", value: data.summary.read, icon: Eye },
        {
          label: "Cevaplandı",
          value: data.summary.submitted,
          icon: ClipboardCheck,
        },
        {
          label: "Hatırlatma",
          value: data.summary.reminded,
          icon: Clock3,
        },
      ]
    : [];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <ClipboardCheck className="h-8 w-8 text-brand" />
            Haftalık Kontroller
          </h1>
          <p className="mt-2 text-muted-foreground">
            Toplu check-in gönderimlerinin ulaşma, okunma ve cevaplanma durumu
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={activeWeek}
            onChange={(event) => {
              setSelectedWeek(event.target.value);
              setExpandedId(null);
            }}
            disabled={!data?.weeks.length}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {(data?.weeks ?? []).map((week) => (
              <option key={week.weekStart} value={week.weekStart}>
                {formatWeek(week.weekStart)} · {week.submitted}/{week.total} cevap
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
            />
            Yenile
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex min-h-[360px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="mt-3 font-medium">Kontrol listesi alınamadı.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query.error instanceof Error ? query.error.message : "Lütfen tekrar deneyin."}
            </p>
          </CardContent>
        </Card>
      ) : !data?.weeks.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-medium">Henüz toplu check-in gönderimi yok</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {summaryCards.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1 text-3xl font-bold">{value}</p>
                  </div>
                  <div className="rounded-xl bg-brand-soft p-3 text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Danışan ara..."
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "Tümü"],
                    ["submitted", "Cevaplayan"],
                    ["waiting", "Bekleyen"],
                    ["unread", "Okumayan"],
                    ["failed", "Sorunlu"],
                  ] as Array<[Filter, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      filter === value
                        ? "border-brand bg-brand text-white"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b bg-card text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-medium">Danışan</th>
                    <th className="px-5 py-4 font-medium">Form</th>
                    <th className="px-5 py-4 font-medium">Push</th>
                    <th className="px-5 py-4 font-medium">Okunma</th>
                    <th className="px-5 py-4 font-medium">Hatırlatma</th>
                    <th className="px-5 py-4 font-medium">Cevap</th>
                    <th className="w-12 px-3 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => {
                    const expanded = expandedId === row.id;
                    return (
                      <Row
                        key={row.id}
                        row={row}
                        expanded={expanded}
                        onToggle={() => setExpandedId(expanded ? null : row.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <div className="py-14 text-center text-sm text-muted-foreground">
                Seçili filtreye uygun danışan bulunamadı.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Row({
  row,
  expanded,
  onToggle,
}: {
  row: CheckInRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-muted/20">
        <td className="px-5 py-4">
          <Link
            href={`/clients/${row.client.id}`}
            className="font-semibold text-foreground hover:text-brand hover:underline"
          >
            {row.client.name} {row.client.surname}
          </Link>
        </td>
        <td className="px-5 py-4">
          {row.sentAt ? (
            <div>
              <StatusPill tone="green">Gönderildi</StatusPill>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(row.sentAt)}
              </p>
            </div>
          ) : (
            <StatusPill tone="red">Gönderilmedi</StatusPill>
          )}
        </td>
        <td className="px-5 py-4">
          <DeliveryPill row={row} />
        </td>
        <td className="px-5 py-4">
          {row.readAt ? (
            <div>
              <StatusPill tone="green">Okundu</StatusPill>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(row.readAt)}
              </p>
            </div>
          ) : (
            <StatusPill tone="slate">Okunmadı</StatusPill>
          )}
        </td>
        <td className="px-5 py-4">
          {row.reminderSentAt ? (
            <div>
              <StatusPill tone="blue">Gönderildi</StatusPill>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(row.reminderSentAt)}
              </p>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-5 py-4">
          {row.submittedAt ? (
            <div>
              <StatusPill tone="green">Cevaplandı</StatusPill>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(row.submittedAt)}
              </p>
            </div>
          ) : (
            <StatusPill tone="amber">Bekleniyor</StatusPill>
          )}
        </td>
        <td className="px-3 py-4">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={expanded ? "Detayı kapat" : "Detayı aç"}
          >
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/15">
          <td colSpan={7} className="px-5 py-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
              <div className="rounded-xl border bg-background p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <BellRing className="h-4 w-4 text-brand" /> Gönderim detayı
                </p>
                <dl className="mt-3 space-y-2 text-xs">
                  <Detail label="Inbox kaydı" value={row.initialNotification ? "Oluşturuldu" : "Oluşturulmadı"} />
                  <Detail label="Push aboneliği" value={`${row.initialNotification?.subscriptionCount ?? 0} cihaz`} />
                  <Detail label="Push başarılı" value={`${row.initialNotification?.sentCount ?? 0}`} />
                  <Detail label="Push hatası" value={`${row.initialNotification?.failedCount ?? 0}`} />
                  {row.initialNotification?.errorMessage && (
                    <Detail label="Hata" value={row.initialNotification.errorMessage} danger />
                  )}
                </dl>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {row.answers ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-600" />
                  )}
                  Danışan yanıtı
                </p>
                {row.answers ? (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {SCORE_LABELS.map(([key, label]) => (
                        <div key={key} className="rounded-lg border bg-muted/15 p-2 text-center">
                          <p className="font-bold">{row.answers?.[key] ?? "—"}/5</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                    {(row.answers.challenge || row.answers.supportRequest) && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <AnswerText label="Zorlandığı konu" value={row.answers.challenge} />
                        <AnswerText label="Beklediği destek" value={row.answers.supportRequest} />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Danışan formu henüz doldurmadı.
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`max-w-[65%] text-right font-medium ${danger ? "text-destructive" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function AnswerText({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm">{value || "Belirtilmedi"}</p>
    </div>
  );
}
