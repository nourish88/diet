import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";

/**
 * Cleanup expired photos (older than 12 hours)
 * This endpoint can be called manually or scheduled with a cron job
 * 
 * Example cron setup (Vercel):
 * vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-photos",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authorization check for cron jobs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify the request
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("⛔ Unauthorized cron job attempt");
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    console.log("🧹 Starting photo cleanup job...");

    const now = new Date();

    // Find expired photos
    const expiredPhotos = await prisma.mealPhoto.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        dietId: true,
        clientId: true,
        expiresAt: true,
      },
    });

    console.log(`📸 Found ${expiredPhotos.length} expired photos`);

    if (expiredPhotos.length === 0) {
      return addCorsHeaders(
        NextResponse.json({
          success: true,
          message: "No expired photos found",
          deleted: 0,
        })
      );
    }

    // Delete expired photos
    const deleteResult = await prisma.mealPhoto.deleteMany({
      where: {
        id: {
          in: expiredPhotos.map((p) => p.id),
        },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} expired photos`);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: `Deleted ${deleteResult.count} expired photos`,
        deleted: deleteResult.count,
        expiredPhotos: expiredPhotos.map((p) => ({
          id: p.id,
          dietId: p.dietId,
          clientId: p.clientId,
          expiredAt: p.expiresAt,
        })),
      })
    );
  } catch (error: any) {
    console.error("❌ Photo cleanup error:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to cleanup photos" },
        { status: 500 }
      )
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

