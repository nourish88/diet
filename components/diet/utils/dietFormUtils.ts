import { Diet, Ogun } from "@/types/types";
import { OGUN } from "@/models/dietModels";
import { sortMealsByTime, stripEmojis } from "@/lib/diet-utils";

/**
 * Convert database diet format to UI diet format
 */
export function convertDbDietToUiDiet(
  dbDiet: any,
  selectedClientId: number | null,
  getClientFullName: (clientId: number | null) => string
): Diet {
  try {
    const mappedOguns =
      dbDiet.oguns?.map((dbOgun: any) => ({
        name: dbOgun.name || "",
        time: dbOgun.time || "",
        detail: stripEmojis(dbOgun.detail || ""),
        order: dbOgun.order || 0,
        items:
          dbOgun.items?.map((dbItem: any) => {
            const miktarValue = dbItem.miktar || "";
            const birimValue =
              typeof dbItem.birim === "object" && dbItem.birim
                ? dbItem.birim.name || ""
                : dbItem.birim || "";
            const besinValue =
              typeof dbItem.besin === "object" && dbItem.besin
                ? dbItem.besin.name || ""
                : dbItem.besin || "";
            const priorityValue =
              typeof dbItem.besin === "object" && dbItem.besin
                ? dbItem.besin.priority ?? null
                : typeof dbItem.besinPriority === "number"
                ? dbItem.besinPriority
                : typeof dbItem.priority === "number"
                ? dbItem.priority
                : null;

            return {
              miktar: miktarValue,
              birim: birimValue,
              besin: besinValue,
              besinPriority: priorityValue,
            };
          }) || [],
      })) || OGUN.map((ogun) => ({ ...ogun, items: [...ogun.items] }));

    return {
      id: dbDiet.id,
      AdSoyad: getClientFullName(selectedClientId),
      Tarih: dbDiet.tarih || dbDiet.createdAt || new Date().toISOString(),
      Hedef: dbDiet.hedef || "",
      Sonuc: dbDiet.sonuc || "",
      Su: dbDiet.su || "",
      Fizik: dbDiet.fizik || "",
      dietitianNote: dbDiet.dietitianNote || "",
      isBirthdayCelebration: dbDiet.isBirthdayCelebration || false,
      isImportantDateCelebrated: dbDiet.isImportantDateCelebrated || false,
      importantDateId: dbDiet.importantDateId || null,
      importantDateName: dbDiet.importantDateName || null,
      Oguns: sortMealsByTime(mappedOguns),
    };
  } catch (error) {
    console.error("Error converting DB diet to UI diet:", error);
    return {
      id: 0,
      AdSoyad: getClientFullName(selectedClientId),
      Tarih: new Date().toISOString(),
      Hedef: "",
      Sonuc: "",
      Su: "",
      Fizik: "",
      dietitianNote: "",
      isBirthdayCelebration: false,
      isImportantDateCelebrated: false,
      importantDateId: null,
      importantDateName: null,
      Oguns: sortMealsByTime(
        OGUN.map((ogun) => ({ ...ogun, items: [...ogun.items] }))
      ),
    };
  }
}

/**
 * Get client full name helper
 */
export function getClientFullName(
  clientId: number | null,
  selectedClientName: string
): string {
  if (!clientId) return "İsimsiz Danışan";
  return selectedClientName || "İsimsiz Danışan";
}

/**
 * Convert template to diet format
 */
export function convertTemplateToDiet(
  template: any,
  selectedClientId: number | null,
  getClientFullName: (clientId: number | null) => string
): Diet {
  return {
    id: 0,
    AdSoyad: getClientFullName(selectedClientId),
    Tarih: new Date().toISOString(),
    Su: template.su || "",
    Fizik: template.fizik || "",
    Hedef: template.hedef || "",
    Sonuc: template.sonuc || "",
    dietitianNote: "",
    isBirthdayCelebration: false,
    isImportantDateCelebrated: false,
    importantDateId: null,
    importantDateName: null,
    Oguns: template.oguns.map((ogun: any) => ({
      name: ogun.name,
      time: ogun.time,
      detail: ogun.detail || "",
      order: ogun.order,
      items: ogun.items.map((item: any) => ({
        miktar: item.miktar,
        birim: item.birim,
        besin: item.besinName,
        besinPriority:
          typeof item.besinPriority === "number"
            ? item.besinPriority
            : typeof item.priority === "number"
            ? item.priority
            : null,
      })),
    })),
  };
}

/**
 * Create a new empty ogun
 */
export function createNewOgun(order: number): Ogun {
  return {
    name: "",
    time: "",
    items: [],
    detail: "",
    order,
  };
}

/**
 * Prepare diet data for PDF generation
 */
export function prepareDietDataForPDF(
  diet: Diet,
  fullName: string,
  dietDate: string | Date
): any {
  return {
    fullName,
    dietDate: typeof dietDate === "string" ? dietDate : dietDate.toString(),
    weeklyResult: diet.Sonuc,
    isBirthdayCelebration: diet.isBirthdayCelebration,
    isImportantDateCelebrated: diet.isImportantDateCelebrated,
    target: diet.Hedef,
    id: diet.id,
    ogunler: (diet.Oguns || []).map((ogun) => ({
      name: ogun.name,
      time: ogun.time,
      notes: ogun.detail,
      menuItems: ogun.items.filter((item) => {
        if (typeof item.besin === "string") {
          return item.besin && item.besin !== "";
        } else if (typeof item.besin === "object" && item.besin) {
          return item.besin.name && item.besin.name.trim() !== "";
        }
        return false;
      }),
    })),
  };
}

