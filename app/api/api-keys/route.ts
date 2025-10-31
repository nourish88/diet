import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { generateApiKey, hashApiKey } from "@/lib/api-key-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// GET /api/api-keys - List all API keys for the authenticated dietitian
export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: { dietitianId: auth.user!.id },
        select: {
          id: true,
          name: true,
          appName: true,
          permissions: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return addCorsHeaders(NextResponse.json({ apiKeys }));
    } catch (error) {
      console.error("Error fetching API keys:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to fetch API keys" },
          { status: 500 }
        )
      );
    }
  }
);

// POST /api/api-keys - Create a new API key
export const POST = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    try {
      const { name, appName, permissions, expiresAt } = await request.json();

      if (!name || !appName) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Name and appName are required" },
            { status: 400 }
          )
        );
      }

      // Generate API key
      const apiKey = generateApiKey();
      const hashedKey = hashApiKey(apiKey);

      // Create API key record
      const apiKeyRecord = await prisma.apiKey.create({
        data: {
          key: hashedKey,
          name,
          appName,
          permissions: permissions || ["*:*"], // Default to all permissions
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          dietitianId: auth.user!.id,
        },
        select: {
          id: true,
          name: true,
          appName: true,
          permissions: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      // Return the API key (only shown once)
      return addCorsHeaders(
        NextResponse.json({
          apiKey: apiKeyRecord,
          key: apiKey, // Only returned on creation
          message:
            "API key created successfully. Save this key securely as it won't be shown again.",
        })
      );
    } catch (error) {
      console.error("Error creating API key:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to create API key" },
          { status: 500 }
        )
      );
    }
  }
);

// PUT /api/api-keys - Update an API key
export const PUT = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const { id, name, appName, permissions, isActive, expiresAt } =
        await request.json();

      if (!id) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "API key ID is required" },
            { status: 400 }
          )
        );
      }

      // Verify ownership
      const existingKey = await prisma.apiKey.findFirst({
        where: { id, dietitianId: auth.user!.id },
      });

      if (!existingKey) {
        return addCorsHeaders(
          NextResponse.json({ error: "API key not found" }, { status: 404 })
        );
      }

      // Update API key
      const updatedKey = await prisma.apiKey.update({
        where: { id },
        data: {
          name,
          appName,
          permissions,
          isActive,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        select: {
          id: true,
          name: true,
          appName: true,
          permissions: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          updatedAt: true,
        },
      });

      return addCorsHeaders(NextResponse.json({ apiKey: updatedKey }));
    } catch (error) {
      console.error("Error updating API key:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to update API key" },
          { status: 500 }
        )
      );
    }
  }
);

// DELETE /api/api-keys - Delete an API key
export const DELETE = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "API key ID is required" },
            { status: 400 }
          )
        );
      }

      // Verify ownership
      const existingKey = await prisma.apiKey.findFirst({
        where: { id: parseInt(id), dietitianId: auth.user!.id },
      });

      if (!existingKey) {
        return addCorsHeaders(
          NextResponse.json({ error: "API key not found" }, { status: 404 })
        );
      }

      // Delete API key
      await prisma.apiKey.delete({
        where: { id: parseInt(id) },
      });

      return addCorsHeaders(
        NextResponse.json({ message: "API key deleted successfully" })
      );
    } catch (error) {
      console.error("Error deleting API key:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to delete API key" },
          { status: 500 }
        )
      );
    }
  }
);
