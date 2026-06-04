import { NextRequest } from "next/server";
import prisma from "./prisma";
import { authenticateApiKey, AuthenticatedApiKey } from "./api-key-auth";

const jwt = require("jsonwebtoken") as {
  verify: (token: string, secret: string) => string | SupabaseJwtPayload;
};

interface SupabaseJwtPayload {
  sub?: string;
  email?: string;
  [key: string]: unknown;
}

export interface VerifiedSupabaseUser {
  id: string;
  email: string;
}

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

export function getSupabaseTokenFromRequest(
  request: NextRequest,
  options: { logAuthHeader?: boolean; logToken?: boolean } = {}
): string | null {
  const { logAuthHeader = false, logToken = false } = options;
  const authHeader = request.headers.get("authorization");

  if (logAuthHeader) {
    console.log(
      "🔑 Auth header:",
      authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : "null"
    );
  }

  let token = authHeader?.replace("Bearer ", "");

  // If no Authorization header, try to find Supabase auth token from cookies
  if (!token) {
    const allCookies = request.cookies.getAll();
    
    // Try multiple cookie name patterns that Supabase SSR might use
    const authCookie = allCookies.find((cookie) => {
      const name = cookie.name.toLowerCase();
      return (
        name.startsWith("sb-") &&
        (name.endsWith("-auth-token") ||
         name.includes("auth-token") ||
         name.includes("access-token"))
      );
    });

    if (authCookie?.value) {
      try {
        // Try to parse as JSON first (Supabase SSR stores session as JSON)
        const sessionData = JSON.parse(decodeURIComponent(authCookie.value));
        token = sessionData.access_token || sessionData.token || sessionData;
      } catch (parseError) {
        // If not JSON, check if it's a base64 encoded token
        const cookieValue = decodeURIComponent(authCookie.value);
        if (cookieValue.startsWith("base64-")) {
          try {
            const decoded = Buffer.from(
              cookieValue.replace("base64-", ""),
              "base64"
            ).toString("utf-8");
            const parsed = JSON.parse(decoded);
            token = parsed.access_token || parsed.token || decoded;
          } catch {
            // If all else fails, use the value directly
            token = cookieValue.replace("base64-", "");
          }
        } else {
          // Use the value directly if it's not JSON or base64
          token = cookieValue;
        }
      }
    }
  }

  if (!token) {
    return null;
  }

  if (logToken) {
    console.log("✅ Token found:", token.substring(0, 20) + "...");
  }

  return token;
}

export function verifySupabaseAccessToken(
  token: string
): VerifiedSupabaseUser | null {
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!supabaseJwtSecret) {
    console.log(
      "❌ Supabase token verification failed:",
      500,
      "Missing SUPABASE_JWT_SECRET"
    );
    return null;
  }

  let verifiedToken: string | SupabaseJwtPayload;
  try {
    verifiedToken = jwt.verify(token, supabaseJwtSecret);
  } catch (verifyError) {
    console.log(
      "❌ Supabase token verification failed:",
      403,
      verifyError instanceof Error ? verifyError.message : "Invalid token"
    );
    return null;
  }

  const user =
    typeof verifiedToken === "string"
      ? null
      : {
          id: verifiedToken.sub,
          email:
            typeof verifiedToken.email === "string"
              ? verifiedToken.email
              : "",
        };

  if (!user || !user.id) {
    console.log("❌ No user in Supabase response");
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
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
    const token = getSupabaseTokenFromRequest(request, {
      logAuthHeader: true,
      logToken: true,
    });

    if (!token) {
      console.log("❌ No token found in headers or cookies");
      return null;
    }

    const user = verifySupabaseAccessToken(token);
    if (!user) {
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

    console.log(
      "✅ Database user found:",
      databaseUser.id,
      databaseUser.email,
      databaseUser.role
    );

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
  handler: (
    request: NextRequest,
    auth: AuthResult,
    context?: any
  ) => Promise<Response>
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
    handler: (
      request: NextRequest,
      auth: AuthResult,
      context?: any
    ) => Promise<Response>
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
  handler: (
    request: NextRequest,
    auth: AuthResult,
    context?: any
  ) => Promise<Response>
) {
  return requireRole(["dietitian"])(handler);
}

export function requireClient(
  handler: (
    request: NextRequest,
    auth: AuthResult,
    context?: any
  ) => Promise<Response>
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
