import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/api/cron-auth";
import {
  sendTestNotificationToClient,
  type TestNotificationType,
} from "@/services/TestClientNotificationService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronCheck = verifyCronRequest(request);
  if (!cronCheck.ok) {
    return NextResponse.json(
      { error: `Unauthorized: ${cronCheck.reason}` },
      { status: 401 },
    );
  }

  const clientId = Number(request.nextUrl.searchParams.get("clientId"));
  const type = request.nextUrl.searchParams.get("type");
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return NextResponse.json(
      { error: "Geçerli bir clientId gerekli." },
      { status: 400 },
    );
  }
  if (type !== "water" && type !== "check-in") {
    return NextResponse.json(
      { error: "type water veya check-in olmalı." },
      { status: 400 },
    );
  }

  try {
    const result = await sendTestNotificationToClient(
      clientId,
      type as TestNotificationType,
    );
    return NextResponse.json({ success: true, test: true, type, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test gönderilemedi." },
      { status: 404 },
    );
  }
}

export const POST = GET;
