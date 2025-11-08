import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

const ACTIVE_THRESHOLD_MS = 30 * 1000;

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { dietId, isActive, source } = await request.json();

    if (!dietId || typeof dietId !== "number") {
      return addCorsHeaders(
        NextResponse.json({ error: "dietId is required" }, { status: 400 })
      );
    }

    const presence = await prisma.conversationPresence.upsert({
      where: {
        userId_dietId: {
          userId: auth.user.id,
          dietId,
        },
      },
      update: {
        isActive: Boolean(isActive),
        source: source ?? null,
      },
      create: {
        userId: auth.user.id,
        dietId,
        isActive: Boolean(isActive),
        source: source ?? null,
      },
    });

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        presence: {
          userId: presence.userId,
          dietId: presence.dietId,
          isActive: presence.isActive,
          source: presence.source,
          lastActiveAt: presence.lastActiveAt,
        },
      })
    );
  } catch (error: any) {
    console.error("❌ Presence update error:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to update presence" },
        { status: 500 }
      )
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const dietIdParam = request.nextUrl.searchParams.get("dietId");
    if (!dietIdParam) {
      return addCorsHeaders(
        NextResponse.json({ error: "dietId query param required" }, { status: 400 })
      );
    }

    const dietId = parseInt(dietIdParam);
    if (isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid dietId" }, { status: 400 })
      );
    }

    const records = await prisma.conversationPresence.findMany({
      where: {
        dietId,
        userId: auth.user.id,
      },
    });

    const now = Date.now();
    const isActive = records.some(
      (presence) =>
        presence.isActive &&
        now - new Date(presence.lastActiveAt).getTime() <= ACTIVE_THRESHOLD_MS
    );

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        isActive,
        records: records.map((presence) => ({
          dietId: presence.dietId,
          userId: presence.userId,
          isActive: presence.isActive,
          source: presence.source,
          lastActiveAt: presence.lastActiveAt,
        })),
      })
    );
  } catch (error: any) {
    console.error("❌ Presence fetch error:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to fetch presence" },
        { status: 500 }
      )
    );
  }
}


