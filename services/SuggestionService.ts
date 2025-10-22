export interface BesinSuggestion {
  id: number;
  name: string;
  miktar: string;
  birim: string;
  usageCount: number;
  isFrequent: boolean;
  groupName?: string;
  lastUsed?: Date | null;
  score: number;
}

const SuggestionService = {
  // Get smart besin suggestions
  async getBesinSuggestions(query: string): Promise<BesinSuggestion[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const response = await fetch(
        `/api/suggestions/besin?q=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error("Error fetching besin suggestions:", error);
      return [];
    }
  },
};

export default SuggestionService;
