import type { Client } from "@prisma/client";
import { apiClient } from "@/lib/api-client";

export const fetchClients = async (params?: {
  skip?: number;
  take?: number;
  search?: string;
}): Promise<{
  clients: Client[];
  total: number;
  hasMore: boolean;
}> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) {
      queryParams.append("skip", params.skip.toString());
    }
    if (params?.take !== undefined) {
      queryParams.append("take", params.take.toString());
    }
    if (params?.search) {
      queryParams.append("search", params.search);
    }

    const url = `/clients${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const data = await apiClient.get<{ clients: Client[]; total: number; hasMore: boolean }>(url);

    if (!data.clients || !Array.isArray(data.clients)) {
      throw new Error("Invalid data format received from server");
    }

    return {
      clients: data.clients,
      total: data.total,
      hasMore: data.hasMore,
    };
  } catch (error) {
    console.error("Error in fetchClients:", error);
    throw error;
  }
};
