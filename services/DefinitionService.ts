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
      const url = type ? `/api/definitions?type=${type}` : "/api/definitions";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching definitions:", error);
      throw error;
    }
  },

  // Create a new definition
  async createDefinition(
    type: DefinitionType,
    name: string
  ): Promise<Definition> {
    try {
      const response = await fetch("/api/definitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create definition");
      }

      const data = await response.json();
      return data;
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
      const response = await fetch(`/api/definitions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update definition");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error updating definition:", error);
      throw error;
    }
  },

  // Delete a definition
  async deleteDefinition(id: number): Promise<void> {
    try {
      const response = await fetch(`/api/definitions/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete definition");
      }
    } catch (error) {
      console.error("Error deleting definition:", error);
      throw error;
    }
  },
};

export default DefinitionService;
