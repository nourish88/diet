import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import SecureStorage, {
  STORAGE_KEYS,
} from "../../../core/storage/secure-storage";
import api from "@/core/api/client";

// Types
export interface User {
  id: number;
  email: string;
  role: "dietitian" | "client";
  isApproved: boolean;
  approvedAt: Date | null;
  clientId?: number; // Only for clients
  client?: {
    name: string;
    surname: string;
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: "client") => Promise<void>;
  logout: () => Promise<void>;
  syncUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true, // Start as true to check session on app load
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          // Sign in with Supabase
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          if (authError) {
            throw new Error(authError.message || "Giriş başarısız.");
          }

          if (!authData.session) {
            throw new Error("Oturum oluşturulamadı");
          }

          // Store token
          await SecureStorage.saveItem(
            STORAGE_KEYS.SUPABASE_TOKEN,
            authData.session.access_token
          );

          // Sync user with backend
          await get().syncUser();
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email: string, password: string, role: "client") => {
        set({ isLoading: true });

        try {
          // Sign up with Supabase
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email,
              password,
            });

          if (authError) {
            throw new Error(authError.message || "Kayıt başarısız.");
          }

          if (!authData.user) {
            throw new Error("Kullanıcı oluşturulamadı");
          }

          // Sync user with backend (as client)
          await api.post("/api/auth/sync", {
            supabaseId: authData.user.id,
            email: authData.user.email,
            role: "client",
          });

          // Store token if session exists
          if (authData.session) {
            await SecureStorage.saveItem(
              STORAGE_KEYS.SUPABASE_TOKEN,
              authData.session.access_token
            );
            await get().syncUser();
          }
        } catch (error) {
          console.error("Register error:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          // Sign out from Supabase
          await supabase.auth.signOut();

          // Clear local storage
          await SecureStorage.clear();

          // Reset state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error("Logout error:", error);
          // Still clear local state even if logout fails
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      syncUser: async () => {
        try {
          console.log("🔄 Starting syncUser...");
          const {
            data: { session },
          } = await supabase.auth.getSession();

          console.log("📱 Session:", session ? "exists" : "null");

          if (!session) {
            console.log("❌ No session found");
            set({ user: null, isAuthenticated: false });
            return;
          }

          console.log("🔍 Getting user from backend...");
          // Get user from backend
          const response = await api.get<{ success: boolean; user: User }>(
            `/api/auth/sync?supabaseId=${session.user.id}`
          );

          console.log("✅ User synced:", response);

          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
            });
          } else {
            console.log("❌ Invalid user response");
            set({ user: null, isAuthenticated: false });
          }
        } catch (error) {
          console.error("❌ Sync user error:", error);
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          return (await SecureStorage.getItem(name)) || null;
        },
        setItem: async (name: string, value: string) => {
          await SecureStorage.saveItem(name, value);
        },
        removeItem: async (name: string) => {
          await SecureStorage.deleteItem(name);
        },
      })),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
