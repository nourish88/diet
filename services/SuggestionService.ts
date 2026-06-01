import { apiClient } from "@/lib/api-client";

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
  priority?: number | null;
}

const SuggestionService = {
  async getBesinSuggestions(
    query: string,
    clientId?: number,
  ): Promise<BesinSuggestion[]> {
    if (!query || query.length < 2) return [];
    try {
      const params = new URLSearchParams({ q: query });
      if (clientId) params.set("clientId", String(clientId));
      const data = await apiClient.get<{ suggestions?: BesinSuggestion[] }>(
        `/suggestions/besin?${params.toString()}`,
      );
      return data.suggestions ?? [];
    } catch (error) {
      console.error("Error fetching besin suggestions:", error);
      return [];
    }
  },
};

export default SuggestionService;
