"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePicker from "@/components/CustomUI/Datepicker";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const progressSchema = z.object({
  date: z.date({
    required_error: "Tarih zorunludur",
  }),
  weight: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
      { message: "Geçerli bir kilo giriniz" }
    ),
  waist: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
      { message: "Geçerli bir bel çevresi giriniz" }
    ),
  hip: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
      { message: "Geçerli bir kalça çevresi giriniz" }
    ),
  bodyFat: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        (!isNaN(parseFloat(val)) &&
          parseFloat(val) >= 0 &&
          parseFloat(val) <= 100),
      { message: "Vücut yağ oranı 0-100 arasında olmalıdır" }
    ),
});

type ProgressFormData = z.infer<typeof progressSchema>;

interface ProgressFormProps {
  onSuccess?: () => void;
}

export default function ProgressForm({ onSuccess }: ProgressFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProgressFormData>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      date: new Date(),
      weight: "",
      waist: "",
      hip: "",
      bodyFat: "",
    },
  });

  const date = watch("date");

  const onSubmit = async (data: ProgressFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          date: data.date.toISOString(),
          weight: data.weight ? parseFloat(data.weight) : null,
          waist: data.waist ? parseFloat(data.waist) : null,
          hip: data.hip ? parseFloat(data.hip) : null,
          bodyFat: data.bodyFat ? parseFloat(data.bodyFat) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Bir hata oluştu");
      }

      toast({
        title: "Başarılı",
        description: "Ölçüm kaydı başarıyla eklendi",
      });

      reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Ölçüm kaydı eklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">
          Tarih <span className="text-red-500">*</span>
        </Label>
        <DatePicker
          selected={date}
          onChange={(date) => setValue("date", date || new Date())}
          placeholder="Tarih seçiniz"
        />
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weight">Kilo (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="Örn: 70.5"
            {...register("weight")}
          />
          {errors.weight && (
            <p className="text-sm text-red-500">{errors.weight.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="waist">Bel Çevresi (cm)</Label>
          <Input
            id="waist"
            type="number"
            step="0.1"
            placeholder="Örn: 85.0"
            {...register("waist")}
          />
          {errors.waist && (
            <p className="text-sm text-red-500">{errors.waist.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hip">Kalça Çevresi (cm)</Label>
          <Input
            id="hip"
            type="number"
            step="0.1"
            placeholder="Örn: 95.0"
            {...register("hip")}
          />
          {errors.hip && (
            <p className="text-sm text-red-500">{errors.hip.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bodyFat">Vücut Yağ Oranı (%)</Label>
          <Input
            id="bodyFat"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="Örn: 25.5"
            {...register("bodyFat")}
          />
          {errors.bodyFat && (
            <p className="text-sm text-red-500">{errors.bodyFat.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Kaydediliyor...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Ölçüm Ekle
          </>
        )}
      </Button>
    </form>
  );
}

