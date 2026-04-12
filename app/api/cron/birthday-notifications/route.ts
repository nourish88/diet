import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders } from "@/lib/cors";
import { sendBirthdayNotificationsForSlot } from "@/services/BirthdayService";

/**
 * GET/POST /api/cron/birthday-notifications?slot=N
 *
 * Cron job endpoint to send birthday notifications to dietitians.
 * Protected by CRON_SECRET env variable.
 *
 * Slot schedule (GMT+3):
 *   slot 0 → 10:00 (07:00 UTC) — notify client[0]
 *   slot 1 → 10:30 (07:30 UTC) — retry client[0] + notify client[1]
 *   slot 2 → 11:00 (08:00 UTC) — retry client[0,1] + notify client[2]
 *   slot 3 → 11:30 (08:30 UTC) — retry client[0,1,2] + notify client[3]
 *   slot 4 → 12:00 (09:00 UTC) — retry client[0,1,2,3] + notify client[4]
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const secretParam = request.nextUrl.searchParams.get("secret");

    if (cronSecret) {
      const isValid =
        authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret;

      if (!isValid) {
        console.log("⛔ Unauthorized birthday notification cron job attempt");
        return addCorsHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        );
      }
    }

    // Read slot param (0 = first notification at 10:00, 1 = 10:30, etc.)
    const slotParam = request.nextUrl.searchParams.get("slot");
    const slot = slotParam !== null ? parseInt(slotParam, 10) : 0;

    if (isNaN(slot) || slot < 0 || slot > 10) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid slot parameter (0-10)" },
          { status: 400 }
        )
      );
    }

    console.log(`🎂 Starting birthday notification job — slot ${slot}...`);

    const result = await sendBirthdayNotificationsForSlot(slot);

    console.log(
      `✅ Birthday notifications slot ${slot}: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`
    );

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        slot,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error: any) {
    console.error("❌ Birthday notification error:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to send birthday notifications" },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

