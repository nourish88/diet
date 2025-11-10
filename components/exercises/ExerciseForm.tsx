"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DatePicker from "@/components/CustomUI/Datepicker";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const exerciseSchema = z.object({
  date: z.date({
    required_error: "Tarih zorunludur",
  }),
  exerciseTypeId: z.string().optional().or(z.literal("none")),
  description: z.string().optional(),
  duration: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseInt(val)) && parseInt(val) > 0),
      { message: "Geçerli bir süre giriniz (dakika)" }
    ),
  steps: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseInt(val)) && parseInt(val) >= 0),
      { message: "Geçerli bir adım sayısı giriniz" }
    ),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface ExerciseFormProps {
  onSuccess?: () => void;
}

export default function ExerciseForm({ onSuccess }: ExerciseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exerciseTypes, setExerciseTypes] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      date: new Date(),
      exerciseTypeId: "",
      description: "",
      duration: "",
      steps: "",
    },
  });

  const date = watch("date");
  const exerciseTypeId = watch("exerciseTypeId");

  useEffect(() => {
    // Fetch exercise types
    const fetchExerciseTypes = async () => {
      try {
        const response = await fetch("/api/definitions?type=egzersiz_tipi");
        if (response.ok) {
          const data = await response.json();
          setExerciseTypes(data.definitions || []);
        }
      } catch (error) {
        console.error("Error fetching exercise types:", error);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchExerciseTypes();
  }, []);

  const onSubmit = async (data: ExerciseFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          date: data.date.toISOString(),
          exerciseTypeId:
            data.exerciseTypeId && data.exerciseTypeId !== "none"
              ? parseInt(data.exerciseTypeId, 10)
              : null,
          description: data.description || null,
          duration: data.duration ? parseInt(data.duration, 10) : null,
          steps: data.steps ? parseInt(data.steps, 10) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Bir hata oluştu");
      }

      toast({
        title: "Başarılı",
        description: "Egzersiz kaydı başarıyla eklendi",
      });

      reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description:
          error.message || "Egzersiz kaydı eklenirken bir hata oluştu",
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

      <div className="space-y-2">
        <Label htmlFor="exerciseTypeId">Egzersiz Tipi</Label>
        {loadingTypes ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : (
          <Select
            value={exerciseTypeId || undefined}
            onValueChange={(value) => {
              if (value === "none") {
                setValue("exerciseTypeId", undefined);
              } else {
                setValue("exerciseTypeId", value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Egzersiz tipi seçiniz (opsiyonel)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Seçilmemiş</SelectItem>
              {exerciseTypes.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Süre (dakika)</Label>
          <Input
            id="duration"
            type="number"
            placeholder="Örn: 30"
            {...register("duration")}
          />
          {errors.duration && (
            <p className="text-sm text-red-500">{errors.duration.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="steps">Adım Sayısı</Label>
          <Input
            id="steps"
            type="number"
            placeholder="Örn: 10000"
            {...register("steps")}
          />
          {errors.steps && (
            <p className="text-sm text-red-500">{errors.steps.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          placeholder="Egzersiz hakkında notlar..."
          {...register("description")}
          rows={3}
        />
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
            Egzersiz Ekle
          </>
        )}
      </Button>
    </form>
  );
}

