const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API Request failed:", error);
      throw error;
    }
  }

  // Auth endpoints
  async syncUser(data: {
    supabaseId: string;
    email: string;
    role: string;
    clientId?: number;
  }) {
    return this.request("/api/auth/sync", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getUser(supabaseId: string) {
    return this.request(`/api/auth/sync?supabaseId=${supabaseId}`);
  }

  // Clients endpoints
  async getClients(params?: {
    dietitianId?: number;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.dietitianId)
      queryParams.append("dietitianId", params.dietitianId.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.skip) queryParams.append("skip", params.skip.toString());
    if (params?.take) queryParams.append("take", params.take.toString());

    return this.request(`/api/clients?${queryParams.toString()}`);
  }

  async getClient(id: number) {
    return this.request(`/api/clients/${id}`);
  }

  // Diets endpoints
  async getDiets(params?: { clientId?: number; dietitianId?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.clientId)
      queryParams.append("clientId", params.clientId.toString());
    if (params?.dietitianId)
      queryParams.append("dietitianId", params.dietitianId.toString());

    return this.request(`/api/diets?${queryParams.toString()}`);
  }

  async getDiet(id: number) {
    return this.request(`/api/diets/${id}`);
  }

  async createDiet(data: any) {
    return this.request("/api/diets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDiet(id: number, data: any) {
    return this.request(`/api/diets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Comments endpoints
  async createComment(data: {
    content: string;
    userId: number;
    dietId: number;
    ogunId?: number;
    menuItemId?: number;
  }) {
    return this.request("/api/comments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getComments(dietId: number, ogunId?: number, menuItemId?: number) {
    const params = new URLSearchParams({ dietId: dietId.toString() });
    if (ogunId) params.append("ogunId", ogunId.toString());
    if (menuItemId) params.append("menuItemId", menuItemId.toString());

    return this.request(`/api/comments?${params}`);
  }

  async deleteComment(commentId: number, userId: number) {
    return this.request(`/api/comments?id=${commentId}&userId=${userId}`, {
      method: "DELETE",
    });
  }

  // Meal photos endpoints
  async createMealPhoto(data: {
    imageData: string;
    dietId: number;
    ogunId: number;
    clientId: number;
  }) {
    return this.request("/api/meal-photos", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMealPhotos(dietId: number, ogunId?: number, clientId?: number) {
    const params = new URLSearchParams({ dietId: dietId.toString() });
    if (ogunId) params.append("ogunId", ogunId.toString());
    if (clientId) params.append("clientId", clientId.toString());

    return this.request(`/api/meal-photos?${params}`);
  }

  async deleteMealPhoto(photoId: number, userId: number) {
    return this.request(`/api/meal-photos?id=${photoId}&userId=${userId}`, {
      method: "DELETE",
    });
  }

  // Client diets endpoint
  async getClientDiets(clientId: number) {
    return this.request(`/api/clients/${clientId}/diets`);
  }

  // Notification preferences endpoints
  async getNotificationPreferences(userId: number) {
    return this.request(`/api/notifications/preferences?userId=${userId}`);
  }

  async updateNotificationPreferences(data: {
    userId: number;
    mealReminders?: boolean;
    dietUpdates?: boolean;
    comments?: boolean;
  }) {
    return this.request("/api/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Existing API endpoints (from the web app)
  async getClients(skip = 0, take = 20, search = "") {
    const params = new URLSearchParams({
      skip: skip.toString(),
      take: take.toString(),
      search,
    });
    return this.request(`/api/clients?${params}`);
  }

  async getClient(clientId: number) {
    return this.request(`/api/clients/${clientId}`);
  }

  async createClient(data: any) {
    return this.request("/api/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateClient(clientId: number, data: any) {
    return this.request(`/api/clients/${clientId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getDiets(clientId?: number) {
    const params = clientId ? `?clientId=${clientId}` : "";
    return this.request(`/api/diets${params}`);
  }

  async getDiet(dietId: number) {
    return this.request(`/api/diets/${dietId}`);
  }

  async createDiet(data: any) {
    return this.request("/api/diets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDiet(dietId: number, data: any) {
    return this.request(`/api/diets/${dietId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteDiet(dietId: number) {
    return this.request(`/api/diets/${dietId}`, {
      method: "DELETE",
    });
  }

  async getBesins() {
    return this.request("/api/besin");
  }

  async getBirims() {
    return this.request("/api/birims");
  }
}

export const apiClient = new ApiClient();
