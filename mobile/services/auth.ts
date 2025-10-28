import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "./api";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: number;
  supabaseId: string;
  email: string;
  role: "dietitian" | "client";
  client?: {
    id: number;
    name: string;
    surname: string;
    phoneNumber?: string;
  };
}

class AuthService {
  private user: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await this.syncUser(session.user);
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
    }
  }

  async signUp(email: string, password: string, role: "dietitian" | "client") {
    console.log("AuthService.signUp called with:", { email, role });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log("Supabase signUp response:", { data, error });

    if (error) throw error;

    if (data.user) {
      // Sync user with our database
      await apiClient.syncUser({
        supabaseId: data.user.id,
        email: data.user.email!,
        role,
      });
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      await this.syncUser(data.user);
    }

    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    this.user = null;
    this.notifyListeners();
  }

  private async syncUser(supabaseUser: any) {
    try {
      const response = await apiClient.getUser(supabaseUser.id);

      if (response.success) {
        this.user = response.user;
        this.notifyListeners();
      } else {
        // User doesn't exist in our database, create them
        const response = await apiClient.syncUser({
          supabaseId: supabaseUser.id,
          email: supabaseUser.email,
          role: "client", // Default role
        });

        if (response.success) {
          this.user = response.user;
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.error("Error syncing user:", error);
    }
  }

  getUser(): User | null {
    return this.user;
  }

  addListener(listener: (user: User | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.user));
  }

  async refreshUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await this.syncUser(user);
    }
  }
}

export const authService = new AuthService();
