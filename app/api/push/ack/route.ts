import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

const AckBody = z
  .object({
    logId: z.number().int().positive().optional(),
    broadcastRecipientId: z.number().int().positive().optional(),
  })
  .refine((value) => value.logId || value.broadcastRecipientId, {
    message: "An acknowledgement id is required",
  });

function isMissingNotificationLogTable(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === "P2021" || err.code === "P2022")
  );
}

export const OPTIONS = async (request: NextRequest) => {
  const corsResponse = handleCors(request);
  return corsResponse ?? new NextResponse(null, { status: 204 });
};

/**
 * POST /api/push/ack — service worker calls this from its `push` event handler
 * to confirm the device actually received the push (FCM 200 only proves we
 * handed it off; this proves the device's SW saw it). Public on purpose: the
 * SW has no session, and the worst case is a stray timestamp on an existing
 * log row.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AckBody.safeParse(body);
    if (!parsed.success) {
      return addCorsHeaders(
        NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
      );
    }
    if (parsed.data.logId) {
      await prisma.notificationLog.update({
        where: { id: parsed.data.logId },
        data: { receivedAt: new Date() },
      });
    }
    if (parsed.data.broadcastRecipientId) {
      await prisma.broadcastRecipient.update({
        where: { id: parsed.data.broadcastRecipientId },
        data: { deliveredAt: new Date(), deliveryStatus: "delivered" },
      });
    }
    return addCorsHeaders(NextResponse.json({ ok: true }));
  } catch (err: any) {
    // P2025 = record not found; treat as no-op so SW retries don't error loudly.
    if (err?.code === "P2025" || isMissingNotificationLogTable(err)) {
      return addCorsHeaders(NextResponse.json({ ok: true, skipped: true }));
    }
    return addCorsHeaders(
      NextResponse.json({ ok: false, error: "ack failed" }, { status: 500 })
    );
  }
}
