import { useQueryClient } from "@tanstack/react-query";

/**
 * Cache invalidation hook
 * Yeni veriler eklendikten veya güncellendiğinde ilgili cache'leri temizler
 */
export function useInvalidateCache() {
  const queryClient = useQueryClient();

  return {
    // Tüm diet cache'lerini invalidate et
    invalidateDiets: () => {
      queryClient.invalidateQueries({ queryKey: ['diet'] });
      queryClient.invalidateQueries({ queryKey: ['diets-list-first-page'] });
      queryClient.invalidateQueries({ queryKey: ['recent-diets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },

    // Tüm client cache'lerini invalidate et
    invalidateClients: () => {
      queryClient.invalidateQueries({ queryKey: ['client'] });
      queryClient.invalidateQueries({ queryKey: ['clients-list-first-page'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },

    // Dashboard cache'ini invalidate et
    invalidateDashboard: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-diets'] });
    },

    // Belirli bir diet'i invalidate et
    invalidateDiet: (dietId: string | number) => {
      queryClient.invalidateQueries({ queryKey: ['diet', dietId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['diets-list-first-page'] });
      queryClient.invalidateQueries({ queryKey: ['recent-diets'] });
    },

    // Belirli bir client'i invalidate et
    invalidateClient: (clientId: string | number) => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['clients-list-first-page'] });
    },
  };
}

