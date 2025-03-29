"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarIcon, Save } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { ToastContainer } from "./ui/toast";
import useClientActions from "@/hooks/useClientActions";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";

interface ClientFormProps {
  initialData?: {
    id?: number;
    name: string;
    surname: string;
    birthdate?: string | null;
    phoneNumber?: string | null;
    notes?: string | null;
  };
  onSuccess?: (clientId: number) => void;
  isEdit?: boolean;
}

const ClientForm = ({
  initialData = {
    name: "",
    surname: "",
    birthdate: null,
    phoneNumber: "",
    notes: "",
  },
  onSuccess,
  isEdit = false,
}: ClientFormProps) => {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createClient, updateClient } = useClientActions();
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

  const handleBirthdateChange = (date: Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      birthdate: date ? date.toISOString() : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.surname) {
        toast({
          title: "Hata",
          description: "İsim ve soyisim alanları zorunludur.",
          variant: "destructive",
        });
        return;
      }

      let client;
      if (isEdit && initialData.id) {
        client = await updateClient(initialData.id, formData);
        if (client) {
          toast({
            title: "Başarılı",
            description: "Müşteri bilgileri güncellendi.",
            variant: "default",
          });
        }
      } else {
        client = await createClient(formData);
        if (client) {
          toast({
            title: "Başarılı",
            description: "Yeni müşteri başarıyla oluşturuldu.",
            variant: "default",
          });

          // Reset form after successful creation
          if (!isEdit) {
            setFormData({
              name: "",
              surname: "",
              birthdate: null,
              phoneNumber: "",
              notes: "",
            });
          }
        }
      }

      if (client && onSuccess) {
        onSuccess(client.id);
      }
    } catch (error) {
      console.error("Error submitting client form:", error);
      toast({
        title: "Hata",
        description: isEdit
          ? "Müşteri bilgileri güncellenirken bir hata oluştu."
          : "Müşteri oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
        <h2 className="text-lg font-medium">
          {isEdit ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
        </h2>
        <p className="text-sm text-blue-100 mt-1">
          {isEdit
            ? "Müşteri bilgilerini güncelleyin"
            : "Yeni müşteri kaydı oluşturun"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              İsim <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Müşterinin ismi"
            />
          </div>

          {/* Surname field */}
          <div>
            <label
              htmlFor="surname"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Soyisim <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="surname"
              name="surname"
              required
              value={formData.surname}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Müşterinin soyismi"
            />
          </div>

          {/* Birthdate field */}
          <div>
            <label
              htmlFor="birthdate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Doğum Tarihi
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal border border-gray-300 shadow-sm"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {formData.birthdate ? (
                    format(new Date(formData.birthdate), "PPP", { locale: tr })
                  ) : (
                    <span className="text-gray-500">Tarih seçin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={
                    formData.birthdate
                      ? new Date(formData.birthdate)
                      : undefined
                  }
                  onSelect={handleBirthdateChange}
                  initialFocus
                  locale={tr}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Phone field */}
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Telefon Numarası
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber || ""}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="05XX XXX XX XX"
            />
          </div>
        </div>

        {/* Notes field */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notlar
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={formData.notes || ""}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Müşteri hakkında notlar..."
          ></textarea>
        </div>

        {/* Form actions */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/clients")}
            className="border-gray-300"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
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
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default ClientForm;
