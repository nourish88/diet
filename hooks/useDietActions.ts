import { useState } from "react";
import { Diet } from "@/types/types";

export const useDietActions = (clientId: number) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDiet, setSavedDiet] = useState<any | null>(null);

  const saveDiet = async (dietData: Diet) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/diets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          dietData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save diet");
      }

      const data = await response.json();
      setSavedDiet(data.diet);
      return data.diet;
    } catch (err: any) {
      console.error("Error saving diet:", err);
      setError(err.message || "An error occurred while saving the diet");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getClientDiets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/diets?clientId=${clientId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get diets");
      }

      const data = await response.json();
      return data.diets;
    } catch (err: any) {
      console.error("Error getting diets:", err);
      setError(err.message || "An error occurred while getting diets");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get the latest diet for a client
  const getClientLatestDiet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First get all diets for this client
      const diets = await getClientDiets();

      // Return the first one (as they're ordered by createdAt DESC)
      if (diets && diets.length > 0) {
        return diets[0];
      }

      return null;
    } catch (err: any) {
      console.error("Error getting latest diet:", err);
      setError(
        err.message || "An error occurred while getting the latest diet"
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getDiet = async (dietId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/diets/${dietId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get diet");
      }

      const data = await response.json();
      return data.diet;
    } catch (err: any) {
      console.error("Error getting diet:", err);
      setError(err.message || "An error occurred while getting the diet");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDiet = async (dietId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/diets/${dietId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete diet");
      }

      return true;
    } catch (err: any) {
      console.error("Error deleting diet:", err);
      setError(err.message || "An error occurred while deleting the diet");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveDiet,
    getClientDiets,
    getDiet,
    deleteDiet,
    getClientLatestDiet,
    isLoading,
    error,
    savedDiet,
  };
};

export default useDietActions;
