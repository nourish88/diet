import { apiClient } from "@/lib/api-client";

export interface Definition {
  id: number;
  type: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DefinitionType = "su_tuketimi" | "fiziksel_aktivite";

const DefinitionService = {
  // Get all definitions by type
  async getDefinitions(type?: DefinitionType): Promise<Definition[]> {
    try {
      const url = type ? `/definitions?type=${type}` : "/definitions";
      return await apiClient.get(url);
    } catch (error) {
      console.error("Error fetching definitions:", error);
      return [];
    }
  },

  // Create a new definition
  async createDefinition(
    type: DefinitionType,
    name: string
  ): Promise<Definition> {
    try {
      return await apiClient.post("/definitions", { type, name });
    } catch (error) {
      console.error("Error creating definition:", error);
      throw error;
    }
  },

  // Update a definition
  async updateDefinition(
    id: number,
    data: { name?: string; isActive?: boolean }
  ): Promise<Definition> {
    try {
      return await apiClient.put(`/definitions/${id}`, data);
    } catch (error) {
      console.error("Error updating definition:", error);
      throw error;
    }
  },

  // Delete a definition
  async deleteDefinition(id: number): Promise<void> {
    try {
      await apiClient.delete(`/definitions/${id}`);
    } catch (error) {
      console.error("Error deleting definition:", error);
      throw error;
    }
  },
};

export default DefinitionService;
