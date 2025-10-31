import { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import prisma from "./prisma";

export interface ApiKeyInfo {
  id: number;
  dietitianId: number;
  name: string;
  appName: string;
  permissions: string[];
  isActive: boolean;
  expiresAt: Date | null;
}

export interface AuthenticatedApiKey {
  apiKey: ApiKeyInfo;
  dietitian: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  const prefix = "diet_";
  const randomPart = randomBytes(32).toString("hex");
  return `${prefix}${randomPart}`;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticate API key from request
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<AuthenticatedApiKey | null> {
  try {
    // Get API key from header
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return null;
    }

    // Hash the provided key
    const hashedKey = hashApiKey(apiKey);

    // Find the API key in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: {
        dietitian: {
          select: {
            id: true,
            email: true,
            role: true,
            isApproved: true,
          },
        },
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    // Check if API key is active
    if (!apiKeyRecord.isActive) {
      return null;
    }

    // Check if API key is expired
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      return null;
    }

    // Check if dietitian is approved
    if (!apiKeyRecord.dietitian.isApproved) {
      return null;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      apiKey: {
        id: apiKeyRecord.id,
        dietitianId: apiKeyRecord.dietitianId,
        name: apiKeyRecord.name,
        appName: apiKeyRecord.appName,
        permissions: apiKeyRecord.permissions as string[],
        isActive: apiKeyRecord.isActive,
        expiresAt: apiKeyRecord.expiresAt,
      },
      dietitian: {
        id: apiKeyRecord.dietitian.id,
        email: apiKeyRecord.dietitian.email,
        role: apiKeyRecord.dietitian.role,
      },
    };
  } catch (error) {
    console.error("API key authentication error:", error);
    return null;
  }
}

/**
 * Check if API key has permission for specific endpoint
 */
export function hasApiKeyPermission(
  apiKey: ApiKeyInfo,
  endpoint: string,
  method: string
): boolean {
  const permission = `${method.toUpperCase()}:${endpoint}`;
  const wildcardPermission = `*:${endpoint}`;
  const methodWildcard = `${method.toUpperCase()}:*`;

  return (
    apiKey.permissions.includes(permission) ||
    apiKey.permissions.includes(wildcardPermission) ||
    apiKey.permissions.includes(methodWildcard) ||
    apiKey.permissions.includes("*:*")
  );
}

/**
 * Middleware to require API key authentication
 */
export function requireApiKey(
  handler: (
    request: NextRequest,
    auth: AuthenticatedApiKey
  ) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const auth = await authenticateApiKey(request);

    if (!auth) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing API key" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return handler(request, auth);
  };
}

/**
 * Middleware to require API key with specific permission
 */
export function requireApiKeyPermission(
  endpoint: string,
  method: string = "GET"
) {
  return function (
    handler: (
      request: NextRequest,
      auth: AuthenticatedApiKey
    ) => Promise<Response>
  ) {
    return async (request: NextRequest) => {
      const auth = await authenticateApiKey(request);

      if (!auth) {
        return new Response(
          JSON.stringify({ error: "Invalid or missing API key" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!hasApiKeyPermission(auth.apiKey, endpoint, method)) {
        return new Response(
          JSON.stringify({ error: "Insufficient API key permissions" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return handler(request, auth);
    };
  };
}
