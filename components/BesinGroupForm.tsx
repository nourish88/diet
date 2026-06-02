"use client";
import { useState } from "react";
import { parseApiResponse } from "@/lib/api/parse-response";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { Toaster } from "./ui/toaster";

interface BesinGroupFormProps {
  initialData?: {
    id?: number;
    description: string;
  };
  onSuccess?: (groupId: number) => void;
  isEdit?: boolean;
}

const BesinGroupForm = ({
  initialData = {
    description: "",
  },
  onSuccess,
  isEdit = false,
}: BesinGroupFormProps) => {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, toasts, dismiss } = useToast();
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.description) {
        toast({
          title: "Hata",
          description: "Grup adı zorunludur.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const apiUrl =
        isEdit && initialData.id
          ? `/api/besin-gruplari/${initialData.id}`
          : "/api/besin-gruplari";

      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await parseApiResponse<{ id: number }>(response);

      toast({
        title: "Başarılı",
        description: isEdit
          ? "Besin grubu başarıyla güncellendi."
          : "Besin grubu başarıyla eklendi.",
        variant: "default",
      });

      if (onSuccess && data.id) {
        onSuccess(data.id);
      } else if (!isEdit) {
        // Reset form after successful creation
        setFormData({
          description: "",
        });
      }
    } catch (error) {
      console.error("Error submitting besin group form:", error);
      toast({
        title: "Hata",
        description: isEdit
          ? "Besin grubu güncellenirken bir hata oluştu."
          : "Besin grubu eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
      <div className="bg-brand-gradient px-6 py-4 text-white">
        <h2 className="text-lg font-medium">
          {isEdit ? "Besin Grubu Düzenle" : "Yeni Besin Grubu Ekle"}
        </h2>
        <p className="text-sm text-blue-100 mt-1">
          {isEdit
            ? "Besin grubu bilgilerini güncelleyin"
            : "Yeni besin grubu kaydı oluşturun"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Grup Adı <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="description"
            name="description"
            required
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border border-border rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Besin grubu adını girin"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Örnek: Süt Ürünleri, Meyveler, Sebzeler, Tahıllar
          </p>
        </div>

        {/* Form actions */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/besin-gruplari")}
            className="border-border"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-gradient hover:opacity-90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? "Güncelle" : "Kaydet"}
              </>
            )}
          </Button>
        </div>
      </form>
      <Toaster />
    </div>
  );
};

export default BesinGroupForm;
