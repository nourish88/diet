import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders } from "@/lib/cors";
import { verifyCronRequest } from "@/lib/api/cron-auth";
import { sendMealReminders } from "@/services/MealReminderService";
import { sendNewDietNotifications } from "@/services/DietNotificationService";
import prisma from "@/lib/prisma";
import { persistApplicationError } from "@/lib/application-error-server";
import { collectNotificationErrors } from "@/services/ApplicationErrorService";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const cronCheck = verifyCronRequest(request);
    if (!cronCheck.ok) {
      return addCorsHeaders(
        NextResponse.json({ error: `Unauthorized: ${cronCheck.reason}` }, { status: 401 })
      );
    }

    console.log("🔔 Starting meal reminder job...");

    // Preserve diagnostics before short-lived notification logs are cleaned up.
    try { await collectNotificationErrors(); }
    catch { console.error("Application error collection temporarily unavailable"); }

    const result = await sendMealReminders();

    console.log(
      `✅ Meal reminder job completed: ${result.sent} sent, ${result.failed} failed, ${result.reminders.length} reminders found`
    );

    // Also send new diet notifications
    console.log("🔔 Starting new diet notification job...");
    try {
      await sendNewDietNotifications();
      console.log("✅ New diet notification job completed");
    } catch (error: any) {
      console.error("❌ New diet notification error:", error);
      await persistApplicationError(prisma, { code: "job_failed", path: "/api/cron/meal-reminders/new-diets" });
      // Don't fail the entire request if new diet notifications fail
    }

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: `Sent ${result.sent} reminders, ${result.failed} failed`,
        sent: result.sent,
        failed: result.failed,
        remindersCount: result.reminders.length,
      })
    );
  } catch (error: any) {
    console.error("❌ Meal reminder error:", error);
    await persistApplicationError(prisma, { code: "job_failed", path: "/api/cron/meal-reminders" });
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to send meal reminders" },
        { status: 500 }
      )
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
