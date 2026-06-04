import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

function isMissingNotificationLogTable(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === "P2021" || err.code === "P2022")
  );
}

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
      if (isMissingNotificationLogTable(err)) {
        log.warn("table missing; returning empty list until migration runs");
        return NextResponse.json({ ok: true, logs: [] });
      }

      log.error("list failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { ok: false, error: "Loglar getirilemedi." },
        { status: 500 },
      );
    }
  },
});
