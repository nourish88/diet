import { createClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "../core/config/constants";
import SecureStorage from "../core/storage/secure-storage";

// Supabase client configuration
const supabaseUrl = APP_CONFIG.SUPABASE_URL;
const supabaseAnonKey = APP_CONFIG.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key) => {
        return await SecureStorage.getItem(key);
      },
      setItem: async (key, value) => {
        await SecureStorage.saveItem(key, value);
      },
      removeItem: async (key) => {
        await SecureStorage.deleteItem(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;

