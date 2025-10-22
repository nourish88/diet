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

      return await response.json();
    } catch (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
  },

  // Get template by ID
  async getTemplate(id: number): Promise<DietTemplate> {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create template");
      }

      return await response.json();
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
      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update template");
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  },

  // Delete template
  async deleteTemplate(id: number): Promise<void> {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  },

  // Use template to create diet
  async useTemplate(templateId: number, clientId: number): Promise<any> {
    try {
      const response = await fetch(`/api/templates/${templateId}/use`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to use template");
      }

      return await response.json();
    } catch (error) {
      console.error("Error using template:", error);
      throw error;
    }
  },
};

export default TemplateService;
