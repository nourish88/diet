import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface ClientData {
  id?: number;
  name: string;
  surname: string;
  birthdate?: string | null;
  phoneNumber?: string;
  notes?: string;
}

const useClientActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClient = async (id: number) => {
    const data = await apiClient.get(`/api/clients/${id}`);
    return data.client;
  };

  const getClients = async (search?: string, take: number = 20) => {
    setIsLoading(true);
    try {
      console.log("Fetching clients from API...");
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      queryParams.append("take", take.toString());
      
      const url = `/api/clients?${queryParams.toString()}`;
      const data = await apiClient.get(url);
      console.log("Raw API response:", data); // Debug the entire response
      return data;
    } catch (err: any) {
      console.error("Error getting clients:", err);
      setError(err.message || "An error occurred while getting clients");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const updateClient = async (clientId: number, data: any) => {
    try {
      const result = await apiClient.put(`/api/clients/${clientId}`, data);
      return result.client;
    } catch (error) {
      console.error("Error updating client:", error);
      throw error;
    }
  };

  const deleteClient = async (clientId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.delete(`/api/clients/${clientId}`);
      return true;
    } catch (err: any) {
      console.error("Error deleting client:", err);
      setError(err.message || "An error occurred while deleting the client");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getClient,
    getClients,
    updateClient,
    deleteClient,
    isLoading,
    error,
  };
};

export default useClientActions;
