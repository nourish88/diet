import { useCallback } from "react";
import { Diet, Ogun, Birim, Besin } from "@/types/types";
import { sortMealsByTime } from "@/lib/diet-utils";
import { stripEmojis } from "@/lib/diet-utils";
import { createNewOgun } from "../utils/dietFormUtils";

interface UseDietFormHandlersProps {
  diet: Diet;
  setDiet: React.Dispatch<React.SetStateAction<Diet>>;
  selectedClientId: number | null;
  clientData: {
    illness: string | null;
    bannedFoods: any[];
  };
  setIsSortingMeals: (value: boolean) => void;
  setRecentlyMovedOgunIndex: (index: number | null) => void;
  dietLogging: {
    isReady: boolean;
    logOgunAdded?: (index: number) => void;
    logOgunRemoved?: (index: number, name?: string) => void;
    logOgunUpdated?: (index: number, field: string, value: string) => void;
    logItemAdded?: (ogunIndex: number, itemIndex: number) => void;
    logItemUpdated?: (
      ogunIndex: number,
      itemIndex: number,
      field: string,
      value: string
    ) => void;
  };
  toast: (options: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
    duration?: number;
  }) => void;
}

export function useDietFormHandlers({
  diet,
  setDiet,
  selectedClientId,
  clientData,
  setIsSortingMeals,
  setRecentlyMovedOgunIndex,
  dietLogging,
  toast,
}: UseDietFormHandlersProps) {
  const handleAddOgun = useCallback(() => {
    const newOgun = createNewOgun(diet.Oguns.length + 1);
    const ogunIndex = diet.Oguns.length;
    setDiet((prev) => {
      const updatedOguns = [...prev.Oguns, newOgun];
      return {
        ...prev,
        Oguns: sortMealsByTime(updatedOguns),
      };
    });

    // Log ogun added
    if (dietLogging.isReady && dietLogging.logOgunAdded) {
      dietLogging.logOgunAdded(ogunIndex);
    }
  }, [diet.Oguns.length, setDiet, dietLogging]);

  const handleRemoveOgun = useCallback(
    (index: number) => {
      const ogunToRemove = diet.Oguns[index];
      setDiet((prev) => {
        const remaining = prev.Oguns.filter((_, idx) => idx !== index);
        return {
          ...prev,
          Oguns: sortMealsByTime(remaining),
        };
      });

      // Log ogun removed
      if (dietLogging.isReady && dietLogging.logOgunRemoved) {
        dietLogging.logOgunRemoved(index, ogunToRemove?.name);
      }
    },
    [diet.Oguns, setDiet, dietLogging]
  );

  const handleOgunChange = useCallback(
    (index: number, field: keyof Ogun, value: string) => {
      const sanitizedValue =
        field === "detail" ? stripEmojis(value || "") : value;

      setDiet((prev) => ({
        ...prev,
        Oguns: prev.Oguns.map((ogun, idx) =>
          idx === index ? { ...ogun, [field]: sanitizedValue } : ogun
        ),
      }));

      if (dietLogging.isReady && dietLogging.logOgunUpdated) {
        dietLogging.logOgunUpdated(index, field as string, sanitizedValue);
      }
    },
    [setDiet, dietLogging]
  );

  const handleMealTimeBlur = useCallback(
    (index: number) => {
      const currentOgun = diet.Oguns[index];
      if (!currentOgun || !currentOgun.time) {
        return;
      }

      const mealLabel = currentOgun.name || "Öğün";
      const sorted = sortMealsByTime([...diet.Oguns]);
      const newIndex = sorted.indexOf(currentOgun);

      setIsSortingMeals(true);
      setDiet((prev) => ({
        ...prev,
        Oguns: sorted,
      }));

      if (newIndex !== -1 && newIndex !== index) {
        setRecentlyMovedOgunIndex(newIndex);
        toast({
          title: "Öğün sırası güncellendi",
          description: `${mealLabel} saat bilgisine göre yeniden konumlandı.`,
          duration: 2500,
        });
      } else {
        setRecentlyMovedOgunIndex(null);
      }

      setTimeout(() => setIsSortingMeals(false), 250);
    },
    [diet.Oguns, setIsSortingMeals, setDiet, setRecentlyMovedOgunIndex, toast]
  );

  const handleAddMenuItem = useCallback(
    (ogunIndex: number) => {
      const itemIndex = diet.Oguns[ogunIndex]?.items.length || 0;
      setDiet((prev) => ({
        ...prev,
        Oguns: prev.Oguns.map((ogun, idx) =>
          idx === ogunIndex
            ? {
                ...ogun,
                items: [
                  ...ogun.items,
                  {
                    birim: {} as Birim,
                    miktar: "", // Allow empty miktar for cases like "sınırsız salata"
                    besin: {} as Besin,
                    besinPriority: null,
                  },
                ],
              }
            : ogun
        ),
      }));

      // Log item added
      if (dietLogging.isReady && dietLogging.logItemAdded) {
        dietLogging.logItemAdded(ogunIndex, itemIndex);
      }
    },
    [diet.Oguns, setDiet, dietLogging]
  );

  const handleMenuItemChange = useCallback(
    (
      ogunIndex: number,
      itemIndex: number,
      field: string,
      value: string
    ) => {
      if (field === "besin" && selectedClientId) {
        // Type the banned foods properly
        interface BannedFood {
          besin: {
            name: string;
            [key: string]: any;
          };
        }

        // Check if the selected food is banned for this client
        const isBanned = clientData.bannedFoods.some(
          (banned: BannedFood) => banned.besin.name === value
        );
        if (isBanned) {
          toast({
            title: "Uyarı",
            description: "Bu besin danışan için yasaklı listesinde!",
            variant: "destructive",
          });
          return;
        }
      }

      setDiet((prev) => {
        const normalizedValue =
          field === "besinPriority"
            ? value === "" || value === null
              ? null
              : Number(value)
            : value;

        const newDiet = {
          ...prev,
          Oguns: prev.Oguns.map((ogun, idx) =>
            idx === ogunIndex
              ? {
                  ...ogun,
                  items: ogun.items.map((item, itemIdx) =>
                    itemIdx === itemIndex
                      ? field === "besinPriority"
                        ? {
                            ...item,
                            besinPriority: normalizedValue as number | null,
                          }
                        : { ...item, [field]: normalizedValue }
                      : item
                  ),
                }
              : ogun
          ),
        };

        return newDiet;
      });

      // Log item updated
      if (dietLogging.isReady && dietLogging.logItemUpdated) {
        const logValue =
          field === "besinPriority"
            ? value === "" || value === null
              ? ""
              : String(Number(value))
            : value;
        dietLogging.logItemUpdated(ogunIndex, itemIndex, field, logValue);
      }
    },
    [selectedClientId, clientData.bannedFoods, setDiet, dietLogging, toast]
  );

  return {
    handleAddOgun,
    handleRemoveOgun,
    handleOgunChange,
    handleMealTimeBlur,
    handleAddMenuItem,
    handleMenuItemChange,
  };
}

