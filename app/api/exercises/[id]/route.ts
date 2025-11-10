import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * PUT /api/exercises/[id]
 * Update exercise log (client only)
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
    const logId = parseInt(id, 10);

    if (isNaN(logId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid log ID" }, { status: 400 })
      );
    }

    // Check if log exists and belongs to user
    const existingLog = await prisma.exerciseLog.findUnique({
      where: { id: logId },
      select: { userId: true },
    });

    if (!existingLog) {
      return addCorsHeaders(
        NextResponse.json({ error: "Log not found" }, { status: 404 })
      );
    }

    if (existingLog.userId !== auth.user.id) {
      return addCorsHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    const body = await request.json();
    const { date, exerciseTypeId, description, duration, steps } = body;

    // Update log
    const log = await prisma.exerciseLog.update({
      where: { id: logId },
      data: {
        date: date ? new Date(date) : undefined,
        exerciseTypeId: exerciseTypeId !== undefined ? (exerciseTypeId ? parseInt(exerciseTypeId, 10) : null) : undefined,
        description: description !== undefined ? description : undefined,
        duration: duration !== undefined ? (duration ? parseInt(duration, 10) : null) : undefined,
        steps: steps !== undefined ? (steps ? parseInt(steps, 10) : null) : undefined,
      },
      include: {
        definition: true,
      },
    });

    return addCorsHeaders(NextResponse.json({ success: true, log }));
  } catch (error: any) {
    console.error("Error updating exercise log:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to update exercise log" },
        { status: 500 }
      )
    );
  }
};

/**
 * DELETE /api/exercises/[id]
 * Delete exercise log (client only)
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
    const logId = parseInt(id, 10);

    if (isNaN(logId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid log ID" }, { status: 400 })
      );
    }

    // Check if log exists and belongs to user
    const existingLog = await prisma.exerciseLog.findUnique({
      where: { id: logId },
      select: { userId: true },
    });

    if (!existingLog) {
      return addCorsHeaders(
        NextResponse.json({ error: "Log not found" }, { status: 404 })
      );
    }

    if (existingLog.userId !== auth.user.id) {
      return addCorsHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    // Delete log
    await prisma.exerciseLog.delete({
      where: { id: logId },
    });

    return addCorsHeaders(NextResponse.json({ success: true }));
  } catch (error: any) {
    console.error("Error deleting exercise log:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to delete exercise log" },
        { status: 500 }
      )
    );
  }
};

