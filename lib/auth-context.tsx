"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase-browser";
import { useRouter } from "next/navigation";
import { apiClient } from "./api-client";
import { requestJson, describeRequestError } from "./http-request";
import { removePushNotificationsForCurrentBrowser } from "@/lib/push-notifications";
import { reportClientError } from "./application-error-client";

interface AuthError {
  message?: string;
  status?: number;
}

interface DatabaseUser {
  id: number;
  supabaseId: string;
  email: string;
  role: "dietitian" | "client" | "assistant";
  isApproved: boolean;
  approvedAt: Date | null;
  assistantOfId?: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  databaseUser: DatabaseUser | null;
  loading: boolean;
  syncError: string | null;
  retryAuth: () => void;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    role: "dietitian" | "client"
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [databaseUser, setDatabaseUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Memoize supabase instance to prevent recreating on every render
  const supabase = useMemo(() => createClient(), []);

  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const retryAuth = useCallback(() => setRetryVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    let eventReceived = false;
    const acceptSession = (nextSession: Session | null) => {
      if (!active) return;
      const changedUser = sessionRef.current?.user.id !== nextSession?.user.id;
      sessionRef.current = nextSession;
      apiClient.clearSessionCache();
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (changedUser) {
        setDatabaseUser(null);
        setSyncError(null);
        setLoading(Boolean(nextSession));
      } else if (!nextSession) {
        setSyncError(null);
        setLoading(false);
      }
    };
    // Supabase awaits these callbacks. Keep network work outside its auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      eventReceived = true;
      acceptSession(nextSession);
    });
    const timer = setTimeout(() => {
      if (active && !eventReceived) {
        setSyncError("Oturum bilgisi alınamadı. Lütfen yeniden deneyin.");
        setLoading(false);
      }
    }, 20000);
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || eventReceived) return;
      if (error) throw error;
      acceptSession(data.session);
    }).catch((error: unknown) => {
      if (!active || eventReceived) return;
      setSyncError(describeRequestError(error));
      setLoading(false);
    }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, [supabase, retryVersion]);

  const authUserId = user?.id;
  useEffect(() => {
    const currentSession = sessionRef.current;
    if (!authUserId || !currentSession) return;
    const controller = new AbortController();
    const isCurrent = () => !controller.signal.aborted && sessionRef.current?.user.id === authUserId;
    setLoading(true);
    setSyncError(null);
    requestJson<{ success: boolean; user: DatabaseUser }>("/api/auth/sync", {
      headers: { Authorization: `Bearer ${currentSession.access_token}` },
      signal: controller.signal,
      timeoutMs: 20000,
    }).then((data) => {
      if (!isCurrent()) return;
      if (!data.success || !data.user || data.user.supabaseId !== authUserId) {
        throw new Error("Hesap kaydı doğrulanamadı. Lütfen yeniden deneyin.");
      }
      setDatabaseUser(data.user);
    }).catch((error: unknown) => {
      if (!isCurrent()) return;
      // A transient connection error is not a sign-out.
      setSyncError(describeRequestError(error));
    }).finally(() => {
      if (isCurrent()) setLoading(false);
    });
    return () => controller.abort();
  }, [authUserId, retryVersion]);

  useEffect(() => {
    if (!syncError) return;
    const retryVisible = () => { if (document.visibilityState === "visible") retryAuth(); };
    window.addEventListener("online", retryVisible);
    document.addEventListener("visibilitychange", retryVisible);
    return () => {
      window.removeEventListener("online", retryVisible);
      document.removeEventListener("visibilitychange", retryVisible);
    };
  }, [syncError, retryAuth]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting sign in for:", email);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Sign in error:", error);
        reportClientError(error, { code: "auth_failed", path: "/login", status: error.status });
        return { 
          error: {
            message: describeRequestError(error),
            status: error.status,
          }
        };
      }

      console.log("✅ Sign in successful");
      return { error: null };
    } catch (err) {
      console.error("❌ Sign in exception:", err);
      reportClientError(err, { code: "auth_failed", path: "/login" });
      const error = err instanceof Error ? err : new Error("Unknown error");
      return { 
        error: {
          message: describeRequestError(error),
        }
      };
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
        return { 
          error: {
            message: describeRequestError(error),
            status: error.status,
          }
        };
      }

      // Sync user to database
      await apiClient.post("/auth/sync", {
        supabaseId: "", // Will be updated when user confirms email
        email,
        role,
      });

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      return { 
        error: {
          message: describeRequestError(error),
        }
      };
    }
  };

  const signOut = async () => {
    try {
      await Promise.race([
        removePushNotificationsForCurrentBrowser(),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch (error) {
      console.warn("Push cleanup skipped during sign out:", error);
    }

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.warn("Supabase sign out failed; clearing local auth state:", error);
    }

    apiClient.clearSessionCache();
    sessionRef.current = null;
    setLoading(false);
    setSyncError(null);
    setSession(null);
    setUser(null);
    setDatabaseUser(null);
    router.replace("/login");
    router.refresh();
  };

  const value = {
    user,
    session,
    databaseUser,
    loading,
    syncError,
    retryAuth,
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
