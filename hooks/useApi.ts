import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types
export interface Diet {
  id: number;
  tarih: string;
  hedef?: string | null;
  sonuc?: string | null;
  su?: string | null;
  fizik?: string | null;
  dietitianNote?: string | null;
  client?: {
    id: number;
    name: string;
    surname: string;
  };
  oguns?: Array<{
    id: number;
    name: string;
    time?: string | null;
    detail?: string | null;
    order: number;
    menuItems?: Array<{
      id: number;
      miktar?: string | null;
      besin?: {
        id: number;
        name: string;
      };
      birim?: {
        id: number;
        name: string;
      };
    }>;
  }>;
}

export interface Client {
  id: number;
  name: string;
  surname: string;
  phoneNumber?: string | null;
  birthdate?: string | null;
  gender?: string | null | number;
  illness?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  bannedFoods?: Array<{
    id: number;
    besin: {
      id: number;
      name: string;
    };
    reason?: string;
  }>;
  diets?: Array<{
    id: number;
    createdAt: string;
    tarih?: string | null;
  }>;
}

export interface DashboardStats {
  totalClients: number;
  totalDiets: number;
  thisMonthDiets: number;
  recentClients: Client[];
}

// Diet Hooks
export function useDiet(id: number | string | undefined, options?: Omit<UseQueryOptions<Diet>, 'queryKey' | 'queryFn'>) {
  return useQuery<Diet>({
    queryKey: ['diet', id],
    queryFn: () => apiClient.get<Diet>(`/diets/${id}`),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

export function useDiets(skip = 0, take = 20, searchTerm = '') {
  return useQuery<{ diets: Diet[]; total: number }>({
    queryKey: ['diets', skip, take, searchTerm],
    queryFn: () => apiClient.get<{ diets: Diet[]; total: number }>(`/diets?skip=${skip}&take=${take}&search=${searchTerm}`),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useSaveDiet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (diet: any) => {
      if (diet.id) {
        return apiClient.put(`/diets/${diet.id}`, diet);
      }
      return apiClient.post('/diets', diet);
    },
    onSuccess: () => {
      // Invalidate all diet-related queries
      queryClient.invalidateQueries({ queryKey: ['diets'] });
      queryClient.invalidateQueries({ queryKey: ['diet'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
    },
  });
}

export function useDeleteDiet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/diets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diets'] });
      queryClient.invalidateQueries({ queryKey: ['diet'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
    },
  });
}

// Client Hooks
export function useClient(id: number | string | undefined, options?: Omit<UseQueryOptions<Client>, 'queryKey' | 'queryFn'>) {
  return useQuery<Client>({
    queryKey: ['client', id],
    queryFn: () => apiClient.get<Client>(`/clients/${id}`),
    enabled: !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
}

export function useClients(skip = 0, take = 20, searchTerm = '') {
  return useQuery<{ clients: Client[]; total: number }>({
    queryKey: ['clients', skip, take, searchTerm],
    queryFn: () => apiClient.get<{ clients: Client[]; total: number }>(`/clients?skip=${skip}&take=${take}&search=${searchTerm}`),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useSaveClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (client: any) => {
      if (client.id) {
        return apiClient.put(`/clients/${client.id}`, client);
      }
      return apiClient.post('/clients', client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Dashboard Hook
export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Invalidation Hook (for manual cache clearing)
export function useInvalidateCache() {
  const queryClient = useQueryClient();
  
  return {
    invalidateDiets: () => queryClient.invalidateQueries({ queryKey: ['diets'] }),
    invalidateClients: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    invalidateDiet: (id: number) => queryClient.invalidateQueries({ queryKey: ['diet', id] }),
    invalidateClient: (id: number) => queryClient.invalidateQueries({ queryKey: ['client', id] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}

