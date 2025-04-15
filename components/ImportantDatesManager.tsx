"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import DatePicker from "./CustomUI/Datepicker";
import { useToast } from "./ui/use-toast";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
      const response = await fetch("/api/important-dates");
      if (!response.ok) throw new Error("Failed to fetch important dates");
      const data = await response.json();
      setImportantDates(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch important dates",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this important date?")) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/important-dates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete important date");

      toast({
        title: "Success",
        description: "Important date deleted successfully",
      });

      fetchImportantDates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete important date",
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
    if (!newDate.name || !newDate.message || !newDate.startDate || !newDate.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const url = editingDate
        ? `/api/important-dates/${editingDate.id}`
        : "/api/important-dates";
      const method = editingDate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDate),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${editingDate ? 'update' : 'create'} important date`);
      }

      setNewDate({
        name: "",
        message: "",
        startDate: null,
        endDate: null,
      });
      setEditingDate(null);
      
      toast({
        title: "Success",
        description: `Important date ${editingDate ? 'updated' : 'created'} successfully`,
      });
      
      fetchImportantDates();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingDate ? 'update' : 'create'} important date`,
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlık
              </label>
              <Input
                value={newDate.name}
                onChange={(e) => setNewDate({ ...newDate, name: e.target.value })}
                placeholder="Önemli tarih başlığını giriniz"
                disabled={isLoading}
                required
                className="border-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mesaj
              </label>
              <Textarea
                value={newDate.message}
                onChange={(e) => setNewDate({ ...newDate, message: e.target.value })}
                placeholder="Önemli tarih mesajını giriniz"
                disabled={isLoading}
                required
                className="border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlangıç Tarihi
                </label>
                <DatePicker
                  selected={newDate.startDate}
                  onSelect={(date) => setNewDate({ ...newDate, startDate: date || null })}
                  placeholder="Başlangıç tarihi seçin"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bitiş Tarihi
                </label>
                <DatePicker
                  selected={newDate.endDate}
                  onSelect={(date) => setNewDate({ ...newDate, endDate: date || null })}
                  placeholder="Bitiş tarihi seçin"
                  disabled={isLoading}
                  minDate={newDate.startDate || undefined}
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
                  className="border-gray-200 hover:bg-gray-50"
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
                ) : (
                  editingDate ? "Güncelle" : "Ekle"
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
                className="border border-gray-200 p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{date.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{date.message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {new Date(date.startDate).toLocaleDateString('tr-TR')} -{" "}
                      {new Date(date.endDate).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(date)}
                      className="h-8 border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(date.id)}
                      disabled={isDeleting === date.id}
                      className="h-8 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
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
