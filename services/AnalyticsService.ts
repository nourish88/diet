export interface TrackingItem {
  besinId: number;
  miktar: string;
  birim: string;
}

const AnalyticsService = {
  // Track besin usage (silent, non-blocking)
  async trackBesinUsage(items: TrackingItem[]): Promise<void> {
    try {
      console.log("🔥 trackBesinUsage called with items:", items);

      // Filter out invalid items
      const validItems = items.filter(
        (item) => item.besinId && typeof item.besinId === "number"
      );

      console.log("🔥 Valid tracking items:", validItems);

      if (validItems.length === 0) {
        console.warn("⚠️ No valid items to track");
        return;
      }

      // Send to API (don't wait for response)
      console.log("🔥 Sending tracking request to /api/stats/track-usage");
      fetch("/api/stats/track-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: validItems }),
      })
        .then((response) => {
          console.log("✅ Tracking API response:", response.status);
          return response.json();
        })
        .then((data) => {
          console.log("✅ Tracking data:", data);
        })
        .catch((error) => {
          // Silent fail - analytics should not break the app
          console.warn("Analytics tracking failed:", error);
        });
    } catch (error) {
      // Silent fail
      console.warn("Analytics tracking error:", error);
    }
  },

  // Extract tracking items from diet data
  extractTrackingItems(dietOguns: any[]): TrackingItem[] {
    console.log("🔥 extractTrackingItems - dietOguns:", dietOguns);
    const items: TrackingItem[] = [];

    dietOguns.forEach((ogun) => {
      console.log(
        "🔥 Processing ogun:",
        ogun.name,
        "items:",
        ogun.items?.length
      );
      if (!ogun.items || !Array.isArray(ogun.items)) return;

      ogun.items.forEach((item: any) => {
        console.log("🔥 Processing item for tracking:", item);

        // Extract besinId from different formats
        let besinId: number | null = null;
        let besinName = "";
        let birimName = "";

        // Handle different besin formats
        if (typeof item.besin === "object" && item.besin) {
          besinId = item.besin.id;
          besinName = item.besin.name || "";
          console.log(
            "🔥 Besin object found - ID:",
            besinId,
            "Name:",
            besinName
          );
        } else if (typeof item.besin === "string") {
          besinName = item.besin;
          console.log("⚠️ Besin is string (no ID):", besinName);
        }

        // Handle different birim formats
        if (typeof item.birim === "object" && item.birim) {
          birimName = item.birim.name || "";
        } else if (typeof item.birim === "string") {
          birimName = item.birim;
        }

        // Only track if we have a valid besinId
        if (besinId && besinName) {
          console.log("✅ Adding to tracking:", {
            besinId,
            miktar: item.miktar,
            birim: birimName,
          });
          items.push({
            besinId,
            miktar: item.miktar || "",
            birim: birimName,
          });
        } else {
          console.warn("⚠️ Skipping item - no besinId:", {
            besinName,
            besinId,
          });
        }
      });
    });

    console.log("🔥 Final tracking items:", items);
    return items;
  },
};

export default AnalyticsService;
