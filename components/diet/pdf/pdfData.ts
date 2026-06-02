import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";

import { Diet } from "@/types/types";
import {
  sanitizeMealNote,
  sanitizeMenuItems,
  sortMealsByTime,
} from "@/lib/diet-utils";

export interface DietPdfData {
  id?: number;
  fullName: string;
  dietDate: string;
  weeklyResult: string;
  target: string;
  ogunler: {
    name: string;
    time: string;
    menuItems: string[];
    notes: string;
  }[];
  waterConsumption: string;
  physicalActivity: string;
  isBirthdayCelebration?: boolean;
  isImportantDateCelebrated?: boolean;
  importantDate?: {
    message: string;
  };
  dietitianNote?: string;
}

export const formatDateTR = (
  dateString: string | null | undefined | Date
) => {
  if (!dateString) {
    return "Tarih Belirtilmemiş";
  }

  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    return format(date, "d MMMM yyyy", { locale: tr });
  } catch {
    return "Geçersiz Tarih";
  }
};

export const formatDateForFileName = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime())
    ? format(date, "yyyy-MM-dd")
    : "tarihsiz";
};

export const buildDietPdfFileName = (pdfData: DietPdfData) =>
  `Beslenme_Programi_${pdfData.fullName.replace(
    /\s+/g,
    "_"
  )}_${formatDateForFileName(pdfData.dietDate)}.pdf`;

export const buildInlineColumns = (
  parts: Array<{
    text?: string;
    image?: string;
    width?: number;
    height?: number;
  }>,
  options?: { textStyle?: string; imageMarginTop?: number }
) => {
  const columnGap = 3;
  return {
    columns: parts.map((part) => {
      if (part.image) {
        return {
          image: part.image,
          width: part.width || 12,
          height: part.height || 12,
          margin: [0, options?.imageMarginTop ?? -1, 0, 0],
        };
      }

      return {
        text: part.text ?? "",
        width: "auto",
        style: options?.textStyle,
      };
    }),
    columnGap,
  } as any;
};

export const normalizePdfMeals = (
  meals: any[],
  options: { fromDiet?: boolean; defaultName?: string } = {}
): DietPdfData["ogunler"] => {
  const { fromDiet = false, defaultName = "" } = options;
  const normalizedMeals = (meals || []).map((meal: any) => {
    const sourceItems = fromDiet ? meal.items : meal.menuItems;
    const menuItems = sanitizeMenuItems(
      Array.isArray(sourceItems) ? sourceItems : []
    );
    const notesSource = fromDiet
      ? meal.detail ?? meal.notes ?? ""
      : meal.notes ?? meal.detail ?? "";

    return {
      name: (meal.name || defaultName).toString().trim(),
      time: (meal.time || "").toString().trim(),
      menuItems: menuItems.length > 0 ? menuItems : ["-"],
      notes: sanitizeMealNote(notesSource),
    };
  });

  return sortMealsByTime(normalizedMeals);
};

export const prepareDirectPdfData = (
  diet: Diet | undefined,
  pdfData: DietPdfData | undefined,
  importantDateMessage = ""
): DietPdfData | null => {
  if (pdfData) {
    return {
      ...pdfData,
      ogunler: normalizePdfMeals(pdfData.ogunler || []),
      isBirthdayCelebration: pdfData.isBirthdayCelebration || false,
      isImportantDateCelebrated: pdfData.isImportantDateCelebrated || false,
      importantDate: pdfData.isImportantDateCelebrated
        ? {
            message:
              importantDateMessage || pdfData.importantDate?.message || "",
          }
        : undefined,
      waterConsumption: pdfData.waterConsumption || "",
      physicalActivity: pdfData.physicalActivity || "",
    };
  }

  if (!diet) {
    return null;
  }

  return {
    fullName: (diet.AdSoyad || "İsimsiz Danışan").trim(),
    dietDate: diet.Tarih || new Date().toISOString(),
    weeklyResult: diet.Sonuc || "Sonuç belirtilmemiş",
    target: diet.Hedef || "Hedef belirtilmemiş",
    ogunler: normalizePdfMeals(diet.Oguns || [], { fromDiet: true }),
    waterConsumption: diet.Su || "Belirtilmemiş",
    physicalActivity: diet.Fizik || "Belirtilmemiş",
    dietitianNote: diet.dietitianNote || "",
    isBirthdayCelebration: diet.isBirthdayCelebration || false,
    isImportantDateCelebrated: diet.isImportantDateCelebrated || false,
    importantDate: diet.isImportantDateCelebrated
      ? { message: importantDateMessage }
      : undefined,
  };
};

export const prepareDatabasePdfData = (diet: any): DietPdfData | null => {
  if (!diet) {
    return null;
  }

  const fallbackName = "İsimsiz Danışan";
  let clientName = fallbackName;

  if (diet.client) {
    const client = diet.client;
    const fromFull =
      typeof client.fullName === "string" ? client.fullName.trim() : "";
    const fromParts = `${client.name ?? ""} ${client.surname ?? ""}`.trim();
    const resolved = fromFull || fromParts;
    clientName = resolved || fallbackName;
  }

  return {
    fullName: clientName,
    dietDate: diet.tarih || diet.createdAt || new Date().toISOString(),
    weeklyResult: diet.sonuc || "Sonuç belirtilmemiş",
    target: diet.hedef || "Hedef belirtilmemiş",
    ogunler: normalizePdfMeals(diet.oguns || [], {
      fromDiet: true,
      defaultName: "Belirtilmemiş",
    }),
    waterConsumption: diet.su || "Belirtilmemiş",
    physicalActivity: diet.fizik || "Belirtilmemiş",
    isBirthdayCelebration: diet.isBirthdayCelebration || false,
    dietitianNote: diet.dietitianNote || "",
  };
};
