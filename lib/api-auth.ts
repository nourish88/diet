import { NextRequest } from "next/server";
import prisma from "./prisma";
import { authenticateApiKey, AuthenticatedApiKey } from "./api-key-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface AuthenticatedUser {
  id: number;
  supabaseId: string;
  email: string;
  role: "dietitian" | "client";
  isApproved: boolean;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  apiKey: AuthenticatedApiKey | null;
  authType: "supabase" | "api-key" | null;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // First try Supabase authentication
    const supabaseAuth = await authenticateSupabase(request);
    if (supabaseAuth) {
      return {
        user: supabaseAuth,
        apiKey: null,
        authType: "supabase",
      };
    }

    // Then try API key authentication
    const apiKeyAuth = await authenticateApiKey(request);
    if (apiKeyAuth) {
      return {
        user: {
          id: apiKeyAuth.dietitian.id,
          supabaseId: "", // API key doesn't have supabase ID
          email: apiKeyAuth.dietitian.email,
          role: apiKeyAuth.dietitian.role as "dietitian" | "client",
          isApproved: true, // API keys are only for approved dietitians
        },
        apiKey: apiKeyAuth,
        authType: "api-key",
      };
    }

    return {
      user: null,
      apiKey: null,
      authType: null,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      user: null,
      apiKey: null,
      authType: null,
    };
  }
}

export async function authenticateSupabase(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get("authorization");
    console.log("🔑 Auth header:", authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : "null");
    let token = authHeader?.replace("Bearer ", "");

    // If no Authorization header, try to find Supabase auth token from cookies
    if (!token) {
      const allCookies = request.cookies.getAll();
      const authCookie = allCookies.find(
        (cookie) =>
          cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")
      );
      
      if (authCookie?.value) {
        try {
          // Supabase stores session as JSON in cookie
          const sessionData = JSON.parse(authCookie.value);
          token = sessionData.access_token || sessionData;
        } catch {
          // If not JSON, use the value directly
          token = authCookie.value;
        }
      }
    }

    if (!token) {
      console.log("❌ No token found in headers or cookies");
      return null;
    }
    
    console.log("✅ Token found:", token.substring(0, 20) + "...");

    // Verify token with Supabase REST API (works in all runtimes)
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
    });

    if (!response.ok) {
      console.log("❌ Supabase token verification failed:", response.status, response.statusText);
      return null;
    }

    const userData = await response.json();
    const user = userData;

    if (!user || !user.id) {
      console.log("❌ No user in Supabase response");
      return null;
    }
    
    console.log("✅ Supabase user verified:", user.id, user.email);

    // Get user from our database
    const databaseUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!databaseUser) {
      console.log("❌ User not found in database for supabaseId:", user.id);
      return null;
    }
    
    if (!databaseUser.isApproved) {
      console.log("❌ User not approved:", databaseUser.id, databaseUser.email);
      return null;
    }
    
    console.log("✅ Database user found:", databaseUser.id, databaseUser.email, databaseUser.role);

    return {
      id: databaseUser.id,
      supabaseId: databaseUser.supabaseId,
      email: databaseUser.email,
      role: databaseUser.role as "dietitian" | "client",
      isApproved: databaseUser.isApproved,
    };
  } catch (error) {
    console.error("Supabase authentication error:", error);
    return null;
  }
}

export function requireAuth(
  handler: (request: NextRequest, auth: AuthResult, context?: any) => Promise<Response>
) {
  return async (request: NextRequest, context?: any) => {
    const auth = await authenticateRequest(request);

    if (!auth.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return handler(request, auth, context);
  };
}

export function requireRole(allowedRoles: ("dietitian" | "client")[]) {
  return function (
    handler: (request: NextRequest, auth: AuthResult, context?: any) => Promise<Response>
  ) {
    return async (request: NextRequest, context?: any) => {
      const auth = await authenticateRequest(request);

      if (!auth.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!allowedRoles.includes(auth.user.role)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      return handler(request, auth, context);
    };
  };
}

export function requireDietitian(
  handler: (request: NextRequest, auth: AuthResult, context?: any) => Promise<Response>
) {
  return requireRole(["dietitian"])(handler);
}

export function requireClient(
  handler: (request: NextRequest, auth: AuthResult, context?: any) => Promise<Response>
) {
  return requireRole(["client"])(handler);
}

/**
 * Ensure user can only access their own data
 */
export function requireOwnData(
  resourceOwnerId: number,
  auth: AuthResult
): boolean {
  if (!auth.user) {
    return false;
  }

  // For clients, they can only access their own data
  if (auth.user.role === "client") {
    return auth.user.id === resourceOwnerId;
  }

  // For dietitians, they can access their own data and their clients' data
  if (auth.user.role === "dietitian") {
    // Check if the resource belongs to this dietitian
    return auth.user.id === resourceOwnerId;
  }

  return false;
}

/**
 * Ensure dietitian can only access their own clients
 */
export async function requireOwnClient(
  clientId: number,
  auth: AuthResult
): Promise<boolean> {
  if (!auth.user || auth.user.role !== "dietitian") {
    return false;
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { dietitianId: true },
    });

    if (!client) {
      return false;
    }

    return client.dietitianId === auth.user.id;
  } catch (error) {
    console.error("Error checking client ownership:", error);
    return false;
  }
}

/**
 * Ensure dietitian can only access their own diets
 */
export async function requireOwnDiet(
  dietId: number,
  auth: AuthResult
): Promise<boolean> {
  if (!auth.user || auth.user.role !== "dietitian") {
    return false;
  }

  try {
    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      select: { dietitianId: true },
    });

    if (!diet) {
      return false;
    }

    return diet.dietitianId === auth.user.id;
  } catch (error) {
    console.error("Error checking diet ownership:", error);
    return false;
  }
}

/**
 * Ensure client can only access their own diets
 */
export async function requireOwnClientDiet(
  dietId: number,
  auth: AuthResult
): Promise<boolean> {
  if (!auth.user || auth.user.role !== "client") {
    return false;
  }

  try {
    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      select: { clientId: true },
    });

    if (!diet) {
      return false;
    }

    // Get client's user ID
    const client = await prisma.client.findUnique({
      where: { id: diet.clientId },
      select: { userId: true },
    });

    if (!client) {
      return false;
    }

    return client.userId === auth.user.id;
  } catch (error) {
    console.error("Error checking client diet ownership:", error);
    return false;
  }
}
