import { useState } from "react";
import { Diet } from "@/types/types";
import AnalyticsService from "@/services/AnalyticsService";
import { apiClient } from "@/lib/api-client";

export function useDietActions() {
  const [isLoading, setIsLoading] = useState(false);

  const saveDiet = async (dietData: Diet) => {
    setIsLoading(true);

    try {
      // Prepare the data for the API
      const apiData = {
        clientId: dietData.clientId || 0,
        tarih: dietData.Tarih,
        sonuc: dietData.Sonuc || "",
        hedef: dietData.Hedef || "",
        su: dietData.Su || "",
        fizik: dietData.Fizik || "",
        dietitianNote: dietData.dietitianNote || "",
        oguns: dietData.Oguns.filter((ogun) => ogun) // Filter out any null/undefined oguns
          .map((ogun) => {
            // Use proper function body with explicit return
            return {
              name: ogun.name || "",
              time: ogun.time || "",
              detail: ogun.detail || "",
              order: ogun.order || 0,
              items: ogun.items
                .filter((item) => item) // Filter out any null/undefined items
                .map((item) => {
                  // Handle besin - could be string or object
                  let besinValue;
                  if (typeof item.besin === "string") {
                    besinValue = item.besin;
                  } else if (typeof item.besin === "object" && item.besin) {
                    besinValue = item.besin.name || "";
                  } else {
                    besinValue = "";
                  }

                  // Handle birim - could be string or object
                  let birimValue;
                  if (typeof item.birim === "string") {
                    birimValue = item.birim;
                  } else if (typeof item.birim === "object" && item.birim) {
                    birimValue = item.birim.name || "";
                  } else {
                    birimValue = "";
                  }

                  return {
                    miktar: item.miktar || "",
                    birim: birimValue,
                    besin: besinValue,
                  };
                }),
            };
          }),
      };

      // Make the API call
      const result = await apiClient.post("/api/diets", apiData);

      // Track usage in background (non-blocking)
      // Use API response data which has besin IDs instead of raw dietData
      console.log("🔥 Tracking usage from API response:", result.diet);
      const trackingItems = AnalyticsService.extractTrackingItems(
        result.diet?.oguns || []
      );
      console.log("🔥 Extracted tracking items:", trackingItems);
      AnalyticsService.trackBesinUsage(trackingItems);

      setIsLoading(false);
      return result.diet;
    } catch (error) {
      setIsLoading(false);
      console.error("Error saving diet:", error);
      throw error;
    }
  };

  return {
    saveDiet,
    isLoading,
  };
}
