import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest, requireDietitian } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/diet-logs
 * Creates a new diet form log entry
 */
export async function POST(request: NextRequest) {
  try {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Check if logging is enabled
    const config = await prisma.systemConfig.findUnique({
      where: { key: "diet_form_logging_enabled" },
    });

    if (!config || config.value !== "true") {
      // Return success even if logging is disabled (fail-safe)
      return addCorsHeaders(NextResponse.json({ success: true, skipped: true }));
    }

    const body = await request.json();
    const {
      sessionId,
      clientId,
      dietId,
      action,
      fieldName,
      fieldValue,
      previousValue,
      metadata,
    } = body;

    // Validate required fields
    if (!sessionId || !action) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Missing required fields: sessionId, action" },
          { status: 400 }
        )
      );
    }

    // Create log entry
    const logEntry = await prisma.dietFormLog.create({
      data: {
        dietitianId: auth.user.id,
        sessionId,
        clientId: clientId ?? null,
        dietId: dietId ?? null,
        action,
        fieldName: fieldName ?? null,
        fieldValue: fieldValue ?? null,
        previousValue: previousValue ?? null,
        metadata: metadata ? metadata : null,
      },
    });

    return addCorsHeaders(
      NextResponse.json({ success: true, id: logEntry.id }, { status: 201 })
    );
  } catch (error: any) {
    console.error("Error creating diet log:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to create log entry" },
        { status: 500 }
      )
    );
  }
}

/**
 * GET /api/diet-logs
 * Retrieves diet form logs with filtering
 */
export const GET = requireDietitian(
  async (request: NextRequest) => {
    try {
      const corsResponse = handleCors(request);
      if (corsResponse) return corsResponse;

      const auth = await authenticateRequest(request);
      if (!auth.user) {
        return addCorsHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        );
      }

      const searchParams = request.nextUrl.searchParams;
      const sessionId = searchParams.get("sessionId");
      const clientId = searchParams.get("clientId");
      const dietId = searchParams.get("dietId");
      const action = searchParams.get("action");
      const limit = parseInt(searchParams.get("limit") || "100");
      const offset = parseInt(searchParams.get("offset") || "0");

      // Build where clause
      const where: any = {
        dietitianId: auth.user.id, // Only show own logs
      };

      if (sessionId) where.sessionId = sessionId;
      if (clientId) where.clientId = parseInt(clientId);
      if (dietId) where.dietId = parseInt(dietId);
      if (action) where.action = action;

      // Get logs
      const logs = await prisma.dietFormLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          dietitian: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Get total count
      const total = await prisma.dietFormLog.count({ where });

      return addCorsHeaders(
        NextResponse.json({
          logs,
          total,
          limit,
          offset,
        })
      );
    } catch (error: any) {
      console.error("Error fetching diet logs:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: error.message || "Failed to fetch logs" },
          { status: 500 }
        )
      );
    }
  }
);

