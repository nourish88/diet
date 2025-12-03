"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProgressForm from "@/components/progress/ProgressForm";
import ProgressChart from "@/components/progress/ProgressChart";
import ProgressSummary from "@/components/progress/ProgressSummary";
import DateRangePicker from "@/components/progress/DateRangePicker";
import { ProgressEntry, calculateProgressSummary, getChartData } from "@/services/ProgressService";
import { TrendingUp, Scale, Ruler, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TanitaProgressChart = dynamic(() => import("@/components/progress/TanitaProgressChart"), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  ),
  ssr: false,
});

export default function ProgressPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEntries = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (dateFrom) {
        params.append("dateFrom", dateFrom.toISOString());
      }
      if (dateTo) {
        params.append("dateTo", dateTo.toISOString());
      }

      const data = await apiClient.get<{ entries: ProgressEntry[] }>(`/progress?${params.toString()}`);
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
  }, [dateFrom, dateTo]);

  const handleSuccess = () => {
    fetchEntries();
    setDialogOpen(false);
  };

  // Fetch Tanita measurements
  const { data: tanitaMeasurements, isLoading: tanitaLoading } = useQuery({
    queryKey: ["tanita-measurements-client"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{
          success: boolean;
          measurements: any[];
        }>(`/tanita/measurements`);
        return data.measurements || [];
      } catch (error: any) {
        // If client is not mapped to Tanita, return empty array
        if (error?.status === 400 || error?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: true,
  });

  const summary = calculateProgressSummary(entries, dateFrom || undefined, dateTo || undefined);
  const chartData = getChartData(entries, dateFrom || undefined, dateTo || undefined);

  // Determine which metrics to show based on available data
  const hasWeight = entries.some((e) => e.weight !== null);
  const hasWaist = entries.some((e) => e.waist !== null);
  const hasHip = entries.some((e) => e.hip !== null);
  const hasBodyFat = entries.some((e) => e.bodyFat !== null);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gelişim Takibi</h1>
          <p className="text-gray-600 mt-1">
            Kilo, ölçü ve vücut yağ oranı takibinizi yapın
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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

      {/* Chart and Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gelişim Grafiği</CardTitle>
              <CardDescription>
                Zaman içindeki değişimlerinizi görselleştirin
              </CardDescription>
            </div>
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Yükleniyor...</p>
            </div>
          ) : (
            <>
              {summary && (
                <div className="mb-6">
                  <ProgressSummary summary={summary} />
                </div>
              )}
              <ProgressChart
                data={chartData}
                showWeight={hasWeight}
                showWaist={hasWaist}
                showHip={hasHip}
                showBodyFat={hasBodyFat}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Son Ölçümler</CardTitle>
          <CardDescription>Kayıtlı ölçüm geçmişiniz</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Yükleniyor...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Henüz ölçüm kaydı bulunmuyor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tarih</th>
                    <th className="text-right p-2">Kilo (kg)</th>
                    <th className="text-right p-2">Bel (cm)</th>
                    <th className="text-right p-2">Kalça (cm)</th>
                    <th className="text-right p-2">Vücut Yağ (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {new Date(entry.date).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="p-2 text-right">
                        {entry.weight !== null ? entry.weight.toFixed(1) : "-"}
                      </td>
                      <td className="p-2 text-right">
                        {entry.waist !== null ? entry.waist.toFixed(1) : "-"}
                      </td>
                      <td className="p-2 text-right">
                        {entry.hip !== null ? entry.hip.toFixed(1) : "-"}
                      </td>
                      <td className="p-2 text-right">
                        {entry.bodyFat !== null
                          ? entry.bodyFat.toFixed(1)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tanita Measurements */}
      {tanitaMeasurements && tanitaMeasurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kilo ve Vücut Kompozisyonu (Tanita)</CardTitle>
            <CardDescription>
              Tanita cihazından alınan detaylı ölçümleriniz
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tanitaLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Tanita ölçümleri yükleniyor...</p>
              </div>
            ) : (
              <TanitaProgressChart data={tanitaMeasurements} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

