import { apiClient } from "@/lib/api-client";

export interface DietTemplate {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  su?: string | null;
  fizik?: string | null;
  hedef?: string | null;
  sonuc?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  oguns: TemplateOgun[];
}

export interface TemplateOgun {
  id: number;
  name: string;
  time: string;
  detail?: string | null;
  order: number;
  items: TemplateMenuItem[];
}

export interface TemplateMenuItem {
  id: number;
  besinName: string;
  miktar: string;
  birim: string;
  order: number;
}

const TemplateService = {
  // Get all templates
  async getTemplates(category?: string): Promise<DietTemplate[]> {
    try {
      const url = category
        ? `/api/templates?category=${category}`
        : "/api/templates";

      console.log("🔍 TemplateService: Fetching templates from:", url);
      const data = await apiClient.get(url);
      console.log("📋 TemplateService: Received data:", data);
      return data;
    } catch (error) {
      console.error("❌ TemplateService: Error fetching templates:", error);
      throw error;
    }
  },

  // Get template by ID
  async getTemplate(id: number): Promise<DietTemplate> {
    try {
      return await apiClient.get(`/api/templates/${id}`);
    } catch (error) {
      console.error("Error fetching template:", error);
      throw error;
    }
  },

  // Create template
  async createTemplate(data: {
    name: string;
    description?: string;
    category?: string;
    su?: string;
    fizik?: string;
    hedef?: string;
    sonuc?: string;
    oguns: any[];
  }): Promise<DietTemplate> {
    try {
      return await apiClient.post("/api/templates", data);
    } catch (error) {
      console.error("Error creating template:", error);
      throw error;
    }
  },

  // Update template
  async updateTemplate(
    id: number,
    data: Partial<DietTemplate>
  ): Promise<DietTemplate> {
    try {
      return await apiClient.put(`/api/templates/${id}`, data);
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  },

  // Delete template
  async deleteTemplate(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/templates/${id}`);
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  },

  // Use template to create diet
  async useTemplate(templateId: number, clientId: number): Promise<any> {
    try {
      return await apiClient.post(`/api/templates/${templateId}/use`, {
        clientId,
      });
    } catch (error) {
      console.error("Error using template:", error);
      throw error;
    }
  },
};

export default TemplateService;
