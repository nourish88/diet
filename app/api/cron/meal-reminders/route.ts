import { NextRequest, NextResponse } from "next/server";
import { addCorsHeaders } from "@/lib/cors";
import { verifyCronRequest } from "@/lib/api/cron-auth";
import { sendMealReminders } from "@/services/MealReminderService";
import { sendNewDietNotifications } from "@/services/DietNotificationService";

export async function GET(request: NextRequest) {
  try {
    const cronCheck = verifyCronRequest(request);
    if (!cronCheck.ok) {
      return addCorsHeaders(
        NextResponse.json({ error: `Unauthorized: ${cronCheck.reason}` }, { status: 401 })
      );
    }

    console.log("🔔 Starting meal reminder job...");

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
