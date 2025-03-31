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
import { Badge } from "@/components/ui/badge";

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
  const [phoneError, setPhoneError] = useState("");
  const { createClient, updateClient } = useClientActions();
  const { toast, toasts, dismiss } = useToast();
  const router = useRouter();

  const validatePhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // If empty, that's fine (optional field)
    if (!cleaned) {
      setPhoneError("");
      return true;
    }

    // Turkish mobile numbers start with 5 and have 10 digits
    const isValid = cleaned.length === 10 && cleaned.startsWith("5");

    if (!isValid) {
      setPhoneError("Telefon 5 ile başlamalı ve 10 haneli olmalıdır");
      return false;
    }

    setPhoneError("");
    return true;
  };

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digits first
    const cleaned = input.replace(/\D/g, "");

    // First, ensure it starts with 5
    if (cleaned.length > 0 && cleaned[0] !== "5" && cleaned[0] !== "") {
      return cleaned.length > 1 ? "5" + cleaned.substring(1, 10) : "5";
    }

    // Then limit to 10 digits
    return cleaned.substring(0, 10);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === "phoneNumber") {
      const formattedValue = formatPhoneNumber(value);
      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
      validatePhoneNumber(formattedValue);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleBirthdateChange = (date: Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      birthdate: date ? date.toISOString() : null,
    }));
  };

  const handleBirthdateInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Store the raw input as a string in a temporary state
    const dateString = e.target.value;

    setFormData((prev) => ({
      ...prev,
      birthdate: dateString || null,
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

      // Validate phone if provided
      if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
        setIsSubmitting(false);
        return;
      }

      // Process the birthdate before submission
      const submissionData = { ...formData };

      if (
        typeof submissionData.birthdate === "string" &&
        submissionData.birthdate.trim()
      ) {
        try {
          // Try to parse the date in DD.MM.YYYY format
          const parts = submissionData.birthdate.split(".");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
            const year = parseInt(parts[2], 10);

            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
              submissionData.birthdate = date.toISOString();
            } else {
              // Invalid date, set to null
              submissionData.birthdate = null;
            }
          } else {
            // Not in correct format, set to null
            submissionData.birthdate = null;
          }
        } catch (error) {
          console.error("Date parsing error:", error);
          submissionData.birthdate = null;
        }
      }

      let client;
      if (isEdit && initialData.id) {
        client = await updateClient(initialData.id, submissionData);
        if (client) {
          toast({
            title: "Başarılı",
            description: "Danışan bilgileri güncellendi.",
            variant: "default",
          });
        }
      } else {
        client = await createClient(submissionData);
        if (client) {
          toast({
            title: "Başarılı",
            description: "Yeni danışan başarıyla oluşturuldu.",
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
          ? "Danışan bilgileri güncellenirken bir hata oluştu."
          : "Danışan oluşturulurken bir hata oluştu.",
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
          {isEdit ? "Danışan Düzenle" : "Yeni Danışan Ekle"}
        </h2>
        <p className="text-sm text-blue-100 mt-1">
          {isEdit
            ? "Danışan bilgilerini güncelleyin"
            : "Yeni danışan kaydı oluşturun"}
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
              placeholder="Danışanın ismi"
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
              placeholder="Danışanın soyismi"
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
            <input
              type="text"
              id="birthdate"
              name="birthdate"
              placeholder="GG.AA.YYYY (örn: 01.05.1990)"
              value={
                typeof formData.birthdate === "string" ? formData.birthdate : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  birthdate: value || null,
                }));
              }}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Doğum tarihini GG.AA.YYYY formatında girin
            </p>
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
              className={`w-full p-2 border ${
                phoneError ? "border-red-500" : "border-gray-300"
              } rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
              placeholder="5XXXXXXXXX"
            />
            {phoneError && (
              <p className="text-xs text-red-500 mt-1">{phoneError}</p>
            )}
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
            placeholder="Danışan hakkında notlar..."
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
