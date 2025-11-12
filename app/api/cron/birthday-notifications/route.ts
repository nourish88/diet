import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders } from "@/lib/cors";
import { sendBirthdayNotifications } from "@/services/BirthdayService";

/**
 * GET/POST /api/cron/birthday-notifications
 * 
 * Cron job endpoint to send birthday notifications to dietitians
 * - Auth: Protected by CRON_SECRET
 * - Schedule: Call at 00:00 (midnight) and 10:00 AM GMT+3 (via Supabase pg_cron)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authorization check for cron jobs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const secretParam = request.nextUrl.searchParams.get("secret");

    // If CRON_SECRET is set, verify the request
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

    console.log("🎂 Starting birthday notification job...");

    const result = await sendBirthdayNotifications();

    console.log(
      `✅ Birthday notification job completed: ${result.sent} sent, ${result.failed} failed, ${result.dietitiansNotified} dietitians notified`
    );

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: `Sent ${result.sent} notifications, ${result.failed} failed, ${result.dietitiansNotified} dietitians notified`,
        sent: result.sent,
        failed: result.failed,
        dietitiansNotified: result.dietitiansNotified,
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

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

