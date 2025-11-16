"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ExerciseForm from "@/components/exercises/ExerciseForm";
import ExerciseChart from "@/components/exercises/ExerciseChart";
import DateRangePicker from "@/components/progress/DateRangePicker";
import { ExerciseLog, groupByExerciseType, getExerciseStats } from "@/services/ExerciseService";
import { Activity, Clock, Footprints, Plus } from "lucide-react";
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

export default function ExercisesPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (dateFrom) {
        params.append("dateFrom", dateFrom.toISOString());
      }
      if (dateTo) {
        params.append("dateTo", dateTo.toISOString());
      }

      const data = await apiClient.get<{ logs: ExerciseLog[] }>(`/exercises?${params.toString()}`);
      setLogs(data.logs || []);
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
    fetchLogs();
  }, [dateFrom, dateTo]);

  const handleSuccess = () => {
    fetchLogs();
    setDialogOpen(false);
  };

  const chartData = groupByExerciseType(logs, dateFrom || undefined, dateTo || undefined);
  const stats = getExerciseStats(logs, dateFrom || undefined, dateTo || undefined);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Antrenman Takibi</h1>
          <p className="text-gray-600 mt-1">
            Egzersiz ve aktivite kayıtlarınızı takip edin
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Egzersiz Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Egzersiz Ekle</DialogTitle>
              <DialogDescription>
                Egzersiz tipi, süre ve açıklama bilgilerinizi girin
              </DialogDescription>
            </DialogHeader>
            <ExerciseForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Toplam Egzersiz</p>
                <p className="text-2xl font-bold">{stats.totalExercises}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Toplam Süre</p>
                <p className="text-2xl font-bold">
                  {stats.totalDuration} dk
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Toplam Adım</p>
                <p className="text-2xl font-bold">
                  {stats.totalSteps.toLocaleString()}
                </p>
              </div>
              <Footprints className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Egzersiz Dağılımı</CardTitle>
              <CardDescription>
                Egzersiz tiplerine göre aktivite dağılımı
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
            <ExerciseChart data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Son Egzersizler</CardTitle>
          <CardDescription>Kayıtlı egzersiz geçmişiniz</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Yükleniyor...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Henüz egzersiz kaydı bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold">
                          {log.definition?.name || "Diğer"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(log.date).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        {log.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {log.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {log.duration && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{log.duration} dk</span>
                      </div>
                    )}
                    {log.steps && (
                      <div className="flex items-center space-x-1">
                        <Footprints className="w-4 h-4" />
                        <span>{log.steps.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

