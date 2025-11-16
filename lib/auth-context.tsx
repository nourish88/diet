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
import { apiClient, type ApiError } from "./api-client";

interface AuthError {
  message?: string;
  status?: number;
}

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

  // Use ref to track if we've already fetched database user to prevent duplicate calls
  const fetchingRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handledRef = useRef(false);

  const fetchDatabaseUser = useCallback(
    async (supabaseId: string, email?: string, session?: Session | null) => {
      // Prevent duplicate fetches for the same user
      if (fetchingRef.current === supabaseId) {
        console.log("⏭️ Already fetching database user for:", supabaseId);
        return;
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      fetchingRef.current = supabaseId;

      // Set a timeout to ensure loading state doesn't hang forever
      timeoutRef.current = setTimeout(() => {
        console.warn(
          "⏰ Timeout fetching database user (5s), forcing loading to false"
        );
        fetchingRef.current = null;
        setLoading(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }, 5000); // 5 second timeout

      try {
        console.log("🔍 Fetching database user for:", { supabaseId, email });

        // Use provided session or get from Supabase
        let currentSession = session;
        if (!currentSession) {
          console.log("📡 Getting session from Supabase (not provided)...");
          const sessionStartTime = Date.now();
          const sessionResult = await supabase.auth.getSession();
          const sessionDuration = Date.now() - sessionStartTime;
          console.log(`📡 Session retrieved in ${sessionDuration}ms`);
          currentSession = sessionResult.data.session;
        } else {
          console.log("✅ Using provided session");
        }
        
        if (!currentSession) {
          console.error("❌ No session available");
          setDatabaseUser(null);
          return;
        }

        console.log("✅ Session available, access_token length:", currentSession.access_token?.length || 0);

        // Use query param with supabaseId for faster response (no need to verify token)
        const url = `/api/auth/sync?supabaseId=${supabaseId}`;
        console.log("📡 Making API call to:", url);
        const startTime = Date.now();
        
        // Use fetch directly with query param to avoid apiClient session cache delay
        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => {
          console.error("⏰ Fetch timeout after 3 seconds");
          fetchController.abort();
        }, 3000);
        
        let response: Response;
        try {
          response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${currentSession.access_token}`,
            },
            signal: fetchController.signal,
          });
          clearTimeout(fetchTimeout);
        } catch (fetchError: unknown) {
          clearTimeout(fetchTimeout);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error("Request timeout after 3 seconds");
          }
          throw fetchError;
        }

        const duration = Date.now() - startTime;
        console.log(`📡 Auth sync GET response (${duration}ms), status: ${response.status}`);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          let errorStatus = response.status;
          
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          
          const error: ApiError = new Error(errorMessage);
          error.status = errorStatus;
          throw error;
        }

        const data = await response.json();
        console.log(`📡 Auth sync GET response data:`, data);

        // Clear timeout on success
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (data?.success && data?.user) {
          setDatabaseUser(data.user);
          console.log("✅ Database user set:", data.user);
        } else {
          console.error(
            "❌ Failed to fetch database user - no user in response:",
            data
          );
          // User might not exist in database - set to null and allow login to proceed
          setDatabaseUser(null);
        }
      } catch (error: unknown) {
        const apiError = error as ApiError;
        console.error("❌ Error fetching database user:", error);
        console.error("❌ Error type:", typeof error);
        console.error("❌ Error name:", apiError?.name);
        console.error("❌ Error message:", apiError?.message);
        console.error("❌ Error stack:", apiError?.stack);
        console.error("❌ Error status:", apiError?.status);
        console.error("❌ Error details:", {
          status: apiError?.status,
          message: apiError?.message,
          name: apiError?.name,
          stack: apiError?.stack?.substring(0, 200),
        });

        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // If 404, user doesn't exist - that's okay, just log it
        if (apiError?.status === 404) {
          console.log(
            "⚠️ User not found in database (404) - may need registration"
          );
        } else if (apiError?.status === 401 || apiError?.status === 403) {
          console.error("❌ Authentication error - session may be invalid");
        } else if (apiError?.message?.includes("timeout") || apiError?.message?.includes("fetch") || apiError?.name === 'AbortError') {
          console.error("❌ Network error or timeout - check API endpoint");
          console.error("❌ This might indicate the endpoint is not responding");
        }

        // Don't block the UI - set databaseUser to null and continue
        setDatabaseUser(null);
      } finally {
        console.log(
          "✅ fetchDatabaseUser finally block - setting loading to false"
        );
        fetchingRef.current = null;
        // CRITICAL: Always set loading to false, even if there was an error
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    // Reset handled ref on mount
    handledRef.current = false;
    console.log("🔄 AuthProvider useEffect - starting auth initialization");

    // Listen for auth changes FIRST - onAuthStateChange fires immediately with current session
    // This is the recommended approach by Supabase
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(
        "🔄 onAuthStateChange event:",
        event,
        session?.user?.email || "no user"
      );

      // Mark as handled when event fires (onAuthStateChange fires immediately)
      if (!handledRef.current) {
        handledRef.current = true;
        console.log(
          "✅ onAuthStateChange fired - marking as handled, setting loading to false"
        );
        // Immediately set loading to false when auth state is received
        setLoading(false);
      }

      // Ignore TOKEN_REFRESHED events to prevent unnecessary fetches
      if (event === "TOKEN_REFRESHED") {
        console.log("🔄 Token refreshed, updating session only");
        setSession(session);
        setUser(session?.user ?? null);
        return;
      }

      // Always update session and user state
      setSession(session);
      setUser(session?.user ?? null);

        if (session?.user) {
          // Only fetch database user if not already fetching this user
          if (fetchingRef.current !== session.user.id) {
            console.log("📞 Calling fetchDatabaseUser from onAuthStateChange");
            await fetchDatabaseUser(session.user.id, session.user.email, session);
          }
        } else {
        setDatabaseUser(null);
        fetchingRef.current = null;
      }
    });

    subscription = authSubscription;

    // Also try getSession as fallback, but don't block UI
    // Run in background without affecting loading state
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;

        if (error) {
          console.error("❌ Error getting session (background):", error);
          return;
        }

        console.log(
          "📋 getSession completed (background):",
          session?.user?.email || "no session"
        );

        // Only update if we haven't already handled it via onAuthStateChange
        if (!handledRef.current && mounted) {
          handledRef.current = true;
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            console.log(
              "📞 Calling fetchDatabaseUser from getSession (fallback)"
            );
            fetchDatabaseUser(session.user.id, session.user.email, session);
          } else {
            setLoading(false);
          }
        }
      })
      .catch((error) => {
        console.error("❌ Error getting session (background):", error);
      });

    // Aggressive fallback timeout - if onAuthStateChange doesn't fire in 1 second, stop loading
    // This ensures UI is never blocked for long
    const fallbackTimeout = setTimeout(() => {
      if (mounted && !handledRef.current) {
        console.warn(
          "⏰ Fallback timeout (1s) - onAuthStateChange didn't fire, forcing loading to false"
        );
        setLoading(false);
        handledRef.current = true;
      }
    }, 1000); // Very short timeout - just in case

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      fetchingRef.current = null;
      handledRef.current = false;
    };
  }, [supabase, fetchDatabaseUser]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting sign in for:", email);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Sign in error:", error);
        return { 
          error: {
            message: error.message,
            status: error.status,
          }
        };
      }

      console.log("✅ Sign in successful");
      return { error: null };
    } catch (err) {
      console.error("❌ Sign in exception:", err);
      const error = err instanceof Error ? err : new Error("Unknown error");
      return { 
        error: {
          message: error.message,
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
            message: error.message,
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
          message: error.message,
        }
      };
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
