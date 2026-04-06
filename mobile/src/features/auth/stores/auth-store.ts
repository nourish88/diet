import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import SecureStorage, {
  STORAGE_KEYS,
} from "../../../core/storage/secure-storage";
import api from "@/core/api/client";
import { pushNotificationService } from "@/core/notifications/push-service";

// Types
export interface User {
  id: number;
  email: string;
  role: "dietitian" | "client";
  isApproved: boolean;
  approvedAt: Date | null;
  referenceCode?: string | null; // Reference code for client matching
  clientId?: number; // Only for clients
  client?: {
    id?: number;
    name: string;
    surname: string;
    kvkkPortalConsentAt?: string | null;
    kvkkPortalConsentVersion?: string | null;
  } | null;
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
          console.log("🔐 Attempting login for:", email);
          
          // Sign in with Supabase
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

          console.log("📧 Auth data:", authData);
          console.log("❌ Auth error:", authError);

          if (authError) {
            // Better error messages
            if (authError.message.includes("Email not confirmed")) {
              throw new Error(
                "E-posta adresiniz onaylanmamış. Lütfen diyetisyeninizle iletişime geçin."
              );
            } else if (authError.message.includes("Invalid login credentials")) {
              throw new Error(
                "E-posta veya şifre hatalı. Lütfen tekrar deneyin."
              );
            }
            throw new Error(authError.message || "Giriş başarısız.");
          }

          if (!authData.session) {
            throw new Error("Oturum oluşturulamadı");
          }

          console.log("✅ Login successful, storing token...");

          // Store token
          await SecureStorage.saveItem(
            STORAGE_KEYS.SUPABASE_TOKEN,
            authData.session.access_token
          );

          console.log("💾 Token saved to storage");
          
          // Verify token was saved
          const savedToken = await SecureStorage.getItem(STORAGE_KEYS.SUPABASE_TOKEN);
          console.log("🔍 Token verification:", savedToken ? "✅ Confirmed in storage" : "❌ Not in storage");

          console.log("🔄 Syncing user with backend...");

          // Sync user with backend
          await get().syncUser();
          
          console.log("✅ User synced successfully");
        } catch (error) {
          console.error("❌ Login error:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email: string, password: string, role: "client") => {
        set({ isLoading: true });

        try {
          console.log("📝 Starting registration for:", email);
          
          // Sign up with Supabase
          let authData: any = null;
          let authError: any = null;
          
          const signUpResult = await supabase.auth.signUp({
            email,
            password,
          });

          authData = signUpResult.data;
          authError = signUpResult.error;

          console.log("📧 Registration auth data:", authData);
          console.log("❌ Registration auth error:", authError);

          // If user already exists in Supabase, try to sign in instead
          if (authError && (authError.message?.includes("already registered") || authError.message?.includes("User already registered"))) {
            console.log("🔄 User already exists in Supabase, attempting sign in...");
            
            const signInResult = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signInResult.error) {
              throw new Error(signInResult.error.message || "Giriş yapılamadı. Şifrenizi kontrol edin.");
            }

            authData = signInResult.data;
            authError = null;
            console.log("✅ Signed in with existing Supabase user");
          } else if (authError) {
            throw new Error(authError.message || "Kayıt başarısız.");
          }

          if (!authData?.user) {
            throw new Error("Kullanıcı oluşturulamadı veya giriş yapılamadı");
          }

          console.log("✅ Supabase user ready, syncing with backend...");

          // Sync user with backend (as client) and get user data
          const syncResponse = await api.post<{ success: boolean; user: User }>(
            "/api/auth/sync",
            {
            supabaseId: authData.user.id,
            email: authData.user.email,
            role: "client",
            }
          );

          console.log("📦 Sync response:", syncResponse);

          // Store token if session exists
          if (authData.session) {
            console.log("💾 Storing session token...");
            await SecureStorage.saveItem(
              STORAGE_KEYS.SUPABASE_TOKEN,
              authData.session.access_token
            );
            
            // Verify token was saved
            const savedToken = await SecureStorage.getItem(STORAGE_KEYS.SUPABASE_TOKEN);
            console.log("🔍 Token verification:", savedToken ? "✅ Confirmed in storage" : "❌ Not in storage");
          } else {
            console.log("⚠️ No session returned from Supabase signup");
          }

          // Set user data immediately with reference code
          if (syncResponse.success && syncResponse.user) {
            console.log("✅ Setting user state with reference code:", syncResponse.user.referenceCode);
            set({
              user: syncResponse.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            console.log("⚠️ Unexpected sync response, falling back to syncUser");
            // Fallback to syncUser if response is not as expected
            await get().syncUser();
          }
          
          console.log("✅ Registration completed successfully");
        } catch (error) {
          console.error("❌ Register error:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          // Remove push notification token
          await pushNotificationService.removePushToken();
          
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
            
            // Register for push notifications (for both clients and dietitians)
            try {
              console.log(`📱 Registering push notifications for ${response.user.role}...`);
              const token = await pushNotificationService.registerForPushNotifications();
              if (token) {
                console.log(`✅ Push notifications registered for ${response.user.role}`);
              } else {
                console.log("⚠️ Push notifications not available (projectId missing or device is simulator)");
              }
            } catch (pushError) {
              console.error("⚠️ Push notification registration failed:", pushError);
              // Don't fail auth if push fails - app still works without push
            }
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
