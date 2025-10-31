"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

interface DatabaseUser {
  id: number;
  supabaseId: string;
  email: string;
  role: "dietitian" | "client";
  isApproved: boolean;
  approvedAt: Date | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  databaseUser: DatabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    role: "dietitian" | "client"
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [databaseUser, setDatabaseUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDatabaseUser(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchDatabaseUser(session.user.id, session.user.email);
      } else {
        setDatabaseUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchDatabaseUser = async (supabaseId: string, email?: string) => {
    try {
      console.log("🔍 Fetching database user for:", { supabaseId, email });

      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supabaseId,
          email: email || user?.email,
          role: "dietitian", // Default role, will be updated from database
        }),
      });

      const data = await response.json();
      console.log("📡 Auth sync response:", data);

      if (data.success && data.user) {
        setDatabaseUser(data.user);
        console.log("✅ Database user set:", data.user);
      } else {
        console.error("❌ Failed to sync user:", data.error);
      }
    } catch (error) {
      console.error("❌ Error fetching database user:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting sign in for:", email);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Sign in error:", error);
        return { error };
      }

      console.log("✅ Sign in successful");
      return { error: null };
    } catch (error) {
      console.error("❌ Sign in exception:", error);
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: "dietitian" | "client"
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Sync user to database
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supabaseId: "", // Will be updated when user confirms email
          email,
          role,
        }),
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setDatabaseUser(null);
    router.push("/login");
  };

  const value = {
    user,
    session,
    databaseUser,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
