import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  authenticateRequest,
  requireDietitian,
  AuthResult,
} from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * GET /api/progress
 * Get progress entries for a client
 * - If called by client: returns their own progress entries
 * - If called by dietitian: requires clientId query param
 */
export const GET = async (request: NextRequest) => {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const clientIdParam = searchParams.get("clientId");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");

    let clientId: number | undefined;
    let userId: number | undefined;

    if (auth.user.role === "dietitian") {
      // Dietitian must provide clientId
      if (!clientIdParam) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "clientId is required for dietitian" },
            { status: 400 }
          )
        );
      }
      clientId = parseInt(clientIdParam, 10);

      // Verify dietitian owns this client
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { dietitianId: true, userId: true },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 })
        );
      }

      if (client.dietitianId !== auth.user.id) {
        return addCorsHeaders(
          NextResponse.json({ error: "Forbidden" }, { status: 403 })
        );
      }

      userId = client.userId || undefined;
    } else if (auth.user.role === "client") {
      // Client can only view their own progress
      const client = await prisma.client.findUnique({
        where: { userId: auth.user.id },
        select: { id: true },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 })
        );
      }

      clientId = client.id;
      userId = auth.user.id;
    } else {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid role" }, { status: 403 })
      );
    }

    if (!clientId || !userId) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Client or user not found" },
          { status: 404 }
        )
      );
    }

    // Build date filter
    const where: any = {
      clientId,
      userId,
    };

    if (dateFromParam || dateToParam) {
      where.date = {};
      if (dateFromParam) {
        where.date.gte = new Date(dateFromParam);
      }
      if (dateToParam) {
        where.date.lte = new Date(dateToParam);
      }
    }

    // Get progress entries
    const entries = await prisma.progressEntry.findMany({
      where,
      orderBy: {
        date: "desc",
      },
    });

    return addCorsHeaders(NextResponse.json({ success: true, entries }));
  } catch (error: any) {
    console.error("Error fetching progress entries:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to fetch progress entries" },
        { status: 500 }
      )
    );
  }
};

/**
 * POST /api/progress
 * Create new progress entry (client only)
 */
export const POST = async (request: NextRequest) => {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "client") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const body = await request.json();
    const { date, weight, waist, hip, bodyFat } = body;

    // Validate required fields
    if (!date) {
      return addCorsHeaders(
        NextResponse.json({ error: "Date is required" }, { status: 400 })
      );
    }

    // Get client for this user
    const client = await prisma.client.findUnique({
      where: { userId: auth.user.id },
      select: { id: true },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    // Create progress entry
    const entry = await prisma.progressEntry.create({
      data: {
        userId: auth.user.id,
        clientId: client.id,
        date: new Date(date),
        weight: weight ? parseFloat(weight) : null,
        waist: waist ? parseFloat(waist) : null,
        hip: hip ? parseFloat(hip) : null,
        bodyFat: bodyFat ? parseFloat(bodyFat) : null,
      },
    });

    return addCorsHeaders(
      NextResponse.json({ success: true, entry }, { status: 201 })
    );
  } catch (error: any) {
    console.error("Error creating progress entry:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to create progress entry" },
        { status: 500 }
      )
    );
  }
};
