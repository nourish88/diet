import { useState } from "react";

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
    const response = await fetch(`/api/clients/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch client');
    }
    const data = await response.json();
    return data.client;
  };

  const getClients = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching clients from API...");
      const response = await fetch("/api/clients");

      if (!response.ok) {
        throw new Error(`Failed to get clients: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Raw API response:", data); // Debug the entire response

      // Since the API returns the array directly, return it
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
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT', // or 'PATCH' for partial updates
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update client');
      }

      const result = await response.json();
      return result.client;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  const deleteClient = async (clientId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete client");
      }

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
