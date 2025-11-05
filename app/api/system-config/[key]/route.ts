import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/system-config/[key]
 * Retrieves a system configuration value
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Authenticate
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { key } = await params;

    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      // Return default value if not found
      return addCorsHeaders(
        NextResponse.json({
          key,
          value: key === "diet_form_logging_enabled" ? "false" : "",
          exists: false,
        })
      );
    }

    return addCorsHeaders(NextResponse.json(config));
  } catch (error: any) {
    console.error("Error fetching system config:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to fetch config" },
        { status: 500 }
      )
    );
  }
}

/**
 * PUT /api/system-config/[key]
 * Updates a system configuration value
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Authenticate
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { key } = await params;
    const body = await request.json();
    const { value, description } = body;

    if (value === undefined) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Value is required" },
          { status: 400 }
        )
      );
    }

    // Upsert configuration
    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: {
        value,
        description: description || undefined,
      },
      create: {
        key,
        value,
        description: description || "System configuration",
      },
    });

    return addCorsHeaders(NextResponse.json(config));
  } catch (error: any) {
    console.error("Error updating system config:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to update config" },
        { status: 500 }
      )
    );
  }
}

