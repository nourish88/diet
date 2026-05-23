"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import DatePicker from "./CustomUI/Datepicker";
import { useToast } from "./ui/use-toast";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { apiClient } from "@/lib/api-client";

interface ImportantDate {
  id: number;
  name: string;
  message: string;
  startDate: Date;
  endDate: Date;
}

export default function ImportantDatesManager() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [editingDate, setEditingDate] = useState<ImportantDate | null>(null);
  const [newDate, setNewDate] = useState({
    name: "",
    message: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
  });

  useEffect(() => {
    fetchImportantDates();
  }, []);

  const fetchImportantDates = async () => {
    try {
      console.log("🔄 ImportantDatesManager: Fetching important dates...");
      const data = await apiClient.get<ImportantDate[]>("/important-dates");
      console.log("📅 ImportantDatesManager: Received data:", data);
      setImportantDates(data);
    } catch (error) {
      console.error("❌ ImportantDatesManager: Error fetching important dates:", error);
      toast({
        title: "Hata",
        description: "Önemli tarihler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu önemli tarihi silmek istediğinize emin misiniz?"))
      return;

    setIsDeleting(id);
    try {
      await apiClient.delete(`/important-dates/${id}`);

      toast({
        title: "Başarılı",
        description: "Önemli tarih başarıyla silindi",
      });

      fetchImportantDates();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Önemli tarih silinirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (date: ImportantDate) => {
    setEditingDate(date);
    setNewDate({
      name: date.name,
      message: date.message,
      startDate: new Date(date.startDate),
      endDate: new Date(date.endDate),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newDate.name ||
      !newDate.message ||
      !newDate.startDate ||
      !newDate.endDate
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (editingDate) {
        await apiClient.put(`/important-dates/${editingDate.id}`, newDate);
      } else {
        await apiClient.post("/important-dates", newDate);
      }

      setNewDate({
        name: "",
        message: "",
        startDate: null,
        endDate: null,
      });
      setEditingDate(null);

      toast({
        title: "Başarılı",
        description: `Önemli tarih ${
          editingDate ? "güncellendi" : "oluşturuldu"
        }`,
      });

      fetchImportantDates();
    } catch (error) {
      toast({
        title: "Hata",
        description:
          error instanceof Error
            ? error.message
            : `Önemli tarih ${editingDate ? "güncellenirken" : "oluşturulurken"} bir hata oluştu`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">
            Önemli Tarih Ekle/Düzenle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Başlık
              </label>
              <Input
                value={newDate.name}
                onChange={(e) =>
                  setNewDate({ ...newDate, name: e.target.value })
                }
                placeholder="Önemli tarih başlığını giriniz"
                disabled={isLoading}
                required
                className="border-border focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Mesaj
              </label>
              <Textarea
                value={newDate.message}
                onChange={(e) =>
                  setNewDate({ ...newDate, message: e.target.value })
                }
                placeholder="Önemli tarih mesajını giriniz"
                disabled={isLoading}
                required
                className="border-border focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Başlangıç Tarihi
                </label>
                <DatePicker
                  selected={newDate.startDate}
                  onChange={(date) =>
                    setNewDate({ ...newDate, startDate: date })
                  }
                  placeholder="Başlangıç tarihi seçin"
                  dateFormat="dd.MM.yyyy"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bitiş Tarihi
                </label>
                <DatePicker
                  selected={newDate.endDate}
                  onChange={(date) => setNewDate({ ...newDate, endDate: date })}
                  placeholder="Bitiş tarihi seçin"
                  dateFormat="dd.MM.yyyy"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingDate && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingDate(null);
                    setNewDate({
                      name: "",
                      message: "",
                      startDate: null,
                      endDate: null,
                    });
                  }}
                  disabled={isLoading}
                  className="border-border hover:bg-muted/30"
                >
                  İptal
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingDate ? "Güncelleniyor..." : "Oluşturuluyor..."}
                  </>
                ) : editingDate ? (
                  "Güncelle"
                ) : (
                  "Ekle"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">
            Önemli Tarihler Listesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {importantDates.map((date) => (
              <div
                key={date.id}
                className="border border-border p-4 rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-foreground">{date.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{date.message}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {new Date(date.startDate).toLocaleDateString("tr-TR")} -{" "}
                      {new Date(date.endDate).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(date)}
                      className="h-8 border-indigo-200 bg-brand-soft text-brand hover:bg-indigo-100 hover:text-brand"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(date.id)}
                      disabled={isDeleting === date.id}
                      className="h-8 border-destructive/30 bg-destructive/10 text-destructive hover:bg-red-100 hover:text-destructive"
                    >
                      {isDeleting === date.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Sil
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
