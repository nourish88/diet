import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/api/cron-auth";
import {
  DEFAULT_WATER_REMINDER_SLOT,
  parseWaterReminderSlot,
} from "@/lib/water-reminder";
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

  const requestedSlot = request.nextUrl.searchParams.get("slot");
  const slot = requestedSlot
    ? parseWaterReminderSlot(requestedSlot)
    : DEFAULT_WATER_REMINDER_SLOT;
  if (!slot) {
    return NextResponse.json(
      { error: "slot 12 veya 17 olmalı." },
      { status: 400 },
    );
  }

  const result = await sendDailyWaterReminderToAllDietUpdateClients(slot);
  return NextResponse.json({ success: true, slot, ...result });
}

export const POST = GET;
