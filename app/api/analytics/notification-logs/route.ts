import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = route({
  auth: "dietitian",
  scope: "analytics.notification-logs",
  handler: async ({ log }) => {
    try {
      const logs = await prisma.notificationLog.findMany({
        orderBy: { sentAt: "desc" },
        take: 100,
        include: {
          client: { select: { name: true, surname: true } },
          ogun: { select: { name: true, time: true } },
        },
      });

      return NextResponse.json({ ok: true, logs });
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { ok: false, error: "Loglar getirilemedi." },
        { status: 500 },
      );
    }
  },
});
