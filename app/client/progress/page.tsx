"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProgressForm from "@/components/progress/ProgressForm";
import { ProgressEntry, calculateProgressSummary } from "@/services/ProgressService";
import { Plus, TrendingDown, TrendingUp, Minus, Scale, Droplets } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const CustomTooltip = ({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg text-sm">
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-bold text-foreground text-base">
          {payload[0].value.toFixed(1)} {unit}
        </p>
      </div>
    );
  }
  return null;
};

function MetricCard({
  label,
  value,
  unit,
  change,
  icon,
  color,
}: {
  label: string;
  value: number | null;
  unit: string;
  change: number | null;
  icon: React.ReactNode;
  color: "blue" | "rose";
}) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      value: "text-blue-700 dark:text-blue-300",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-800",
      icon: "text-rose-600 dark:text-rose-400",
      value: "text-rose-700 dark:text-rose-300",
    },
  };
  const c = colorMap[color];

  const TrendIcon =
    change === null ? Minus : change < 0 ? TrendingDown : TrendingUp;
  const trendColor =
    change === null
      ? "text-muted-foreground"
      : change < 0
      ? "text-emerald-600"
      : "text-rose-500";

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between">
        <div className={`${c.icon} mb-3`}>{icon}</div>
        {change !== null && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(change).toFixed(1)} {unit}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {value !== null ? (
        <p className={`text-3xl font-bold ${c.value}`}>
          {value.toFixed(1)}
          <span className="text-base font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
      ) : (
        <p className="text-2xl font-bold text-muted-foreground">—</p>
      )}
    </div>
  );
}

function MiniAreaChart({
  data,
  dataKey,
  color,
  unit,
  gradientId,
}: {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  color: string;
  unit: string;
  gradientId: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Henüz veri yok
      </div>
    );
  }

  const values = data
    .map((d) => d[dataKey] as number | null)
    .filter((v): v is number => v !== null);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 100;
  const padding = (maxVal - minVal) * 0.15 || 2;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
        <XAxis
          dataKey="dateFormatted"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          domain={[minVal - padding, maxVal + padding]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          stroke="currentColor"
          className="text-muted-foreground"
          tickFormatter={(v) => v.toFixed(0)}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} />
        {values.length > 0 && (
          <ReferenceLine
            y={values[values.length - 1]}
            stroke={color}
            strokeDasharray="4 4"
            strokeOpacity={0.4}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ r: 4, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: color, strokeWidth: 2, stroke: "white" }}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function ProgressPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ entries: ProgressEntry[] }>("/progress");
      setEntries(data.entries || []);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Veriler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSuccess = () => {
    fetchEntries();
    setDialogOpen(false);
  };

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [entries]
  );

  const chartData = useMemo(
    () =>
      sortedEntries.map((e) => ({
        date: e.date,
        dateFormatted: new Date(e.date).toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "short",
        }),
        weight: e.weight,
        bodyFat: e.bodyFat,
      })),
    [sortedEntries]
  );

  const lastEntry = useMemo(() => {
    if (sortedEntries.length === 0) return null;
    return sortedEntries[sortedEntries.length - 1];
  }, [sortedEntries]);

  const firstEntry = useMemo(() => {
    if (sortedEntries.length === 0) return null;
    return sortedEntries[0];
  }, [sortedEntries]);

  const weightChange = useMemo(() => {
    if (!lastEntry || !firstEntry || lastEntry === firstEntry) return null;
    if (lastEntry.weight === null || firstEntry.weight === null) return null;
    return lastEntry.weight - firstEntry.weight;
  }, [lastEntry, firstEntry]);

  const fatChange = useMemo(() => {
    if (!lastEntry || !firstEntry || lastEntry === firstEntry) return null;
    if (lastEntry.bodyFat === null || firstEntry.bodyFat === null) return null;
    return lastEntry.bodyFat - firstEntry.bodyFat;
  }, [lastEntry, firstEntry]);

  const hasWeight = entries.some((e) => e.weight !== null);
  const hasBodyFat = entries.some((e) => e.bodyFat !== null);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gelişim Takibi</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Kilo ve vücut yağ oranı değişimleriniz
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Ölçüm Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Ölçüm Ekle</DialogTitle>
              <DialogDescription>
                Kilo, bel/kalça çevresi ve vücut yağ oranı bilgilerinizi girin
              </DialogDescription>
            </DialogHeader>
            <ProgressForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center rounded-2xl border border-dashed border-border bg-muted/20">
          <Scale className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">Henüz ölçüm yok</p>
            <p className="text-sm text-muted-foreground mt-1">
              İlk ölçümünüzü ekleyerek takibe başlayın
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            İlk Ölçümü Ekle
          </Button>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Son Kilo"
              value={lastEntry?.weight ?? null}
              unit="kg"
              change={weightChange}
              icon={<Scale className="h-5 w-5" />}
              color="blue"
            />
            <MetricCard
              label="Son Yağ Oranı"
              value={lastEntry?.bodyFat ?? null}
              unit="%"
              change={fatChange}
              icon={<Droplets className="h-5 w-5" />}
              color="rose"
            />
          </div>

          {/* Weight Chart */}
          {hasWeight && (
            <Card className="rounded-2xl border-blue-100 dark:border-blue-900/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Scale className="h-4 w-4" />
                  Kilo Değişimi
                </CardTitle>
                <CardDescription className="text-xs">
                  {sortedEntries.length} ölçüm — başlangıçtan bugüne
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MiniAreaChart
                  data={chartData}
                  dataKey="weight"
                  color="#3b82f6"
                  unit="kg"
                  gradientId="weightGrad"
                />
              </CardContent>
            </Card>
          )}

          {/* Body Fat Chart */}
          {hasBodyFat && (
            <Card className="rounded-2xl border-rose-100 dark:border-rose-900/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <Droplets className="h-4 w-4" />
                  Vücut Yağ Oranı
                </CardTitle>
                <CardDescription className="text-xs">
                  {sortedEntries.filter((e) => e.bodyFat !== null).length} ölçüm — başlangıçtan bugüne
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MiniAreaChart
                  data={chartData}
                  dataKey="bodyFat"
                  color="#f43f5e"
                  unit="%"
                  gradientId="fatGrad"
                />
              </CardContent>
            </Card>
          )}

          {/* Recent Entries Table */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Son Ölçümler</CardTitle>
              <CardDescription className="text-xs">Tüm kayıtlı ölçümler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Tarih</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Kilo</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Yağ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sortedEntries].reverse().map((entry, i) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-border/50 ${i === 0 ? "bg-muted/30 font-medium" : ""}`}
                      >
                        <td className="py-2.5 pr-3 text-foreground">
                          {new Date(entry.date).toLocaleDateString("tr-TR")}
                          {i === 0 && (
                            <span className="ml-2 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
                              son
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-700 dark:text-blue-400">
                          {entry.weight !== null ? `${entry.weight.toFixed(1)} kg` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                          {entry.bodyFat !== null ? `%${entry.bodyFat.toFixed(1)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
