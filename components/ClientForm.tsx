"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/use-toast";
import MultiBesinSelector from "./MultiBesinSelector";

const clientSchema = z.object({
  name: z.string().min(1, "İsim zorunludur"),
  surname: z.string().min(1, "Soyisim zorunludur"),
  birthdate: z
    .string()
    .nullable()
    .transform((val) => (val && val !== "" ? val : null)),
  phoneNumber: z.string().nullable(),
  notes: z.string().nullable(),
  gender: z
    .string()
    .transform((val) => (val ? parseInt(val) : null))
    .nullable(),
  illness: z.string().nullable(),
});

interface ClientFormProps {
  initialData?: any;
  onSuccess: (clientId: number) => void;
  isEdit?: boolean;
}

const ClientForm = ({ initialData, onSuccess, isEdit }: ClientFormProps) => {
  const { toast } = useToast();
  const [selectedBesins, setSelectedBesins] = useState(
    initialData?.bannedBesins?.map((ban: any) => ({
      besinId: ban.besinId,
      reason: ban.reason,
    })) || []
  );

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: initialData?.name || "",
      surname: initialData?.surname || "",
      birthdate: initialData?.birthdate
        ? new Date(initialData.birthdate).toISOString().split("T")[0]
        : null,
      phoneNumber: initialData?.phoneNumber || "",
      notes: initialData?.notes || "",
      gender: initialData?.gender?.toString() || null,
      illness: initialData?.illness || "",
    },
  });

  const handleSelectedBesinsChange = (
    newSelectedBesins: Array<{ besinId: number; reason?: string }>
  ) => {
    try {
      // Always ensure we're setting a valid array
      if (!newSelectedBesins) {
        setSelectedBesins([]);
        return;
      }

      if (!Array.isArray(newSelectedBesins)) {
        console.warn("Invalid selectedBesins value:", newSelectedBesins);
        setSelectedBesins([]);
        return;
      }

      // Filter out invalid items
      const validBesins = newSelectedBesins.filter(
        (item) => item && typeof item === "object" && "besinId" in item
      );

      setSelectedBesins(validBesins);
    } catch (error) {
      console.error("Error updating selectedBesins:", error);
      setSelectedBesins([]);
    }
  };

  const onSubmit = async (values: z.infer<typeof clientSchema>) => {
    try {
      console.log("Raw form values:", values);

      const transformedValues = {
        ...values,
        birthdate:
          values.birthdate && values.birthdate.trim() !== ""
            ? new Date(values.birthdate).toISOString()
            : null,
        gender: values.gender,
      };

      console.log("Transformed values being sent to API:", transformedValues);

      const response = await fetch(
        isEdit ? `/api/clients/${initialData.id}` : "/api/clients",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...transformedValues,
            bannedBesins: selectedBesins,
          }),
        }
      );

      const contentType = response.headers.get("content-type");
      let errorMessage = "İşlem başarısız";

      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const textError = await response.text();
          console.error("Non-JSON error response:", textError);
          errorMessage = "Sunucu hatası oluştu";
        }
        throw new Error(errorMessage);
      }

      // Only try to parse JSON if we have a JSON response
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error("Sunucudan geçersiz yanıt alındı");
      }

      console.log("API success response:", data);

      toast({
        title: "Başarılı",
        description: isEdit
          ? "Danışan güncellendi"
          : "Yeni danışan oluşturuldu",
      });

      onSuccess(isEdit ? initialData.id : data.client.id);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-semibold mb-6">
        {isEdit ? "Danışan Düzenle" : "Yeni Danışan Ekle"}
      </h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              İsim
            </label>
            <Input
              {...form.register("name")}
              className="w-full"
              placeholder="İsim giriniz"
            />
            {form.formState.errors.name && (
              <span className="text-red-500 text-sm">
                {form.formState.errors.name.message as string}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Soyisim
            </label>
            <Input
              {...form.register("surname")}
              className="w-full"
              placeholder="Soyisim giriniz"
            />
            {form.formState.errors.surname && (
              <span className="text-red-500 text-sm">
                {form.formState.errors.surname.message as string}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Doğum Tarihi
            </label>
            <Input
              type="date"
              {...form.register("birthdate")}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Cinsiyet
            </label>
            <div className="flex space-x-4 mt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="1"
                  {...form.register("gender")}
                  className="h-4 w-4 text-blue-600"
                />
                <span>Erkek</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="2"
                  {...form.register("gender")}
                  className="h-4 w-4 text-pink-600"
                />
                <span>Kadın</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Telefon
            </label>
            <Input
              {...form.register("phoneNumber", {
                pattern: {
                  value: /^5\d{9}$/,
                  message:
                    "Telefon numarası 5 ile başlamalı ve 10 haneli olmalıdır",
                },
                validate: (value) => {
                  if (!value) return true; // Optional field
                  if (value.length === 0) return true;
                  if (value.length !== 10)
                    return "Telefon numarası 10 haneli olmalıdır";
                  if (!value.startsWith("5"))
                    return "Telefon numarası 5 ile başlamalıdır";
                  if (!/^\d+$/.test(value))
                    return "Telefon numarası sadece rakam içermelidir";
                  return true;
                },
              })}
              className="w-full"
              placeholder="5XXXXXXXXX formatında giriniz"
              maxLength={10}
              type="tel"
              onInput={(e) => {
                const input = e.currentTarget;
                input.value = input.value.replace(/[^0-9]/g, ""); // Only allow numbers
                if (input.value.length > 0 && !input.value.startsWith("5")) {
                  input.value = "5" + input.value.substring(1);
                }
              }}
            />
            {form.formState.errors.phoneNumber && (
              <span className="text-red-500 text-sm">
                {form.formState.errors.phoneNumber.message as string}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Yasaklı Besinler
            </label>
            <MultiBesinSelector
              selectedBesins={selectedBesins || []}
              onChange={handleSelectedBesinsChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Notlar
          </label>
          <Textarea
            {...form.register("notes")}
            className="w-full"
            placeholder="Danışan hakkında notlar..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Hastalık
          </label>
          <Textarea
            {...form.register("illness")}
            className="w-full"
            placeholder="Varsa hastalık bilgilerini giriniz"
            rows={4}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white"
        >
          {isEdit ? "Güncelle" : "Kaydet"}
        </Button>
      </form>
    </div>
  );
};

export default ClientForm;
