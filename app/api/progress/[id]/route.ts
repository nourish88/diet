import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * PUT /api/progress/[id]
 * Update progress entry (client only)
 */
export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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

    const { id } = await params;
    const entryId = parseInt(id, 10);

    if (isNaN(entryId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid entry ID" }, { status: 400 })
      );
    }

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.progressEntry.findUnique({
      where: { id: entryId },
      select: { userId: true },
    });

    if (!existingEntry) {
      return addCorsHeaders(
        NextResponse.json({ error: "Entry not found" }, { status: 404 })
      );
    }

    if (existingEntry.userId !== auth.user.id) {
      return addCorsHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    const body = await request.json();
    const { date, weight, waist, hip, bodyFat } = body;

    // Update entry
    const entry = await prisma.progressEntry.update({
      where: { id: entryId },
      data: {
        date: date ? new Date(date) : undefined,
        weight:
          weight !== undefined
            ? weight
              ? parseFloat(weight)
              : null
            : undefined,
        waist:
          waist !== undefined ? (waist ? parseFloat(waist) : null) : undefined,
        hip: hip !== undefined ? (hip ? parseFloat(hip) : null) : undefined,
        bodyFat:
          bodyFat !== undefined
            ? bodyFat
              ? parseFloat(bodyFat)
              : null
            : undefined,
      },
    });

    return addCorsHeaders(NextResponse.json({ success: true, entry }));
  } catch (error: any) {
    console.error("Error updating progress entry:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to update progress entry" },
        { status: 500 }
      )
    );
  }
};

/**
 * DELETE /api/progress/[id]
 * Delete progress entry (client only)
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "client") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const entryId = parseInt(id, 10);

    if (isNaN(entryId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid entry ID" }, { status: 400 })
      );
    }

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.progressEntry.findUnique({
      where: { id: entryId },
      select: { userId: true },
    });

    if (!existingEntry) {
      return addCorsHeaders(
        NextResponse.json({ error: "Entry not found" }, { status: 404 })
      );
    }

    if (existingEntry.userId !== auth.user.id) {
      return addCorsHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    // Delete entry
    await prisma.progressEntry.delete({
      where: { id: entryId },
    });

    return addCorsHeaders(NextResponse.json({ success: true }));
  } catch (error: any) {
    console.error("Error deleting progress entry:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to delete progress entry" },
        { status: 500 }
      )
    );
  }
};
