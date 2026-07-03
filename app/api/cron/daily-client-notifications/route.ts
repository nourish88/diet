import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/api/cron-auth";
import { sendDailyWaterReminderToAllDietUpdateClients } from "@/services/ClientNotificationService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronCheck = verifyCronRequest(request);
  if (!cronCheck.ok) {
    return NextResponse.json(
      { error: `Unauthorized: ${cronCheck.reason}` },
      { status: 401 }
    );
  }

  const result = await sendDailyWaterReminderToAllDietUpdateClients();
  return NextResponse.json({ success: true, ...result });
}

export const POST = GET;
