import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/api/cron-auth";
import { sendWeeklyCheckIns } from "@/services/WeeklyCheckInService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronCheck = verifyCronRequest(request);
  if (!cronCheck.ok) {
    return NextResponse.json(
      { error: `Unauthorized: ${cronCheck.reason}` },
      { status: 401 },
    );
  }

  const mode = request.nextUrl.searchParams.get("mode");
  if (mode !== "initial" && mode !== "reminder") {
    return NextResponse.json(
      { error: "mode must be initial or reminder" },
      { status: 400 },
    );
  }

  const result = await sendWeeklyCheckIns(mode);
  return NextResponse.json({ success: true, ...result });
}

export const POST = GET;
