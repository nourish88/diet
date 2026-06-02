import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "analytics.diet-logs-summary",
  handler: async ({ auth }) => {
    const dietitianId = auth.user!.id;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await prisma.dietFormLog.findMany({
      where: { dietitianId, createdAt: { gte: since } },
      select: { sessionId: true, action: true, fieldName: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const sessionMap = new Map<string, { opened?: Date; saved?: Date }>();
    for (const entry of logs) {
      if (!sessionMap.has(entry.sessionId)) sessionMap.set(entry.sessionId, {});
      const session = sessionMap.get(entry.sessionId)!;
      if (entry.action === "form_opened" && !session.opened) {
        session.opened = entry.createdAt;
      }
      if (entry.action === "diet_saved" && !session.saved) {
        session.saved = entry.createdAt;
      }
    }

    const durations: number[] = [];
    for (const { opened, saved } of sessionMap.values()) {
      if (opened && saved && saved > opened) {
        durations.push((saved.getTime() - opened.getTime()) / 60000);
      }
    }
    const avgMinutes =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    const fieldCounts = new Map<string, number>();
    for (const entry of logs) {
      if (
        (entry.action === "item_removed" || entry.action === "field_changed") &&
        entry.fieldName
      ) {
        fieldCounts.set(
          entry.fieldName,
          (fieldCounts.get(entry.fieldName) ?? 0) + 1,
        );
      }
    }
    const topFrictionFields = [...fieldCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, count]) => ({ field, count }));

    return {
      avgMinutes,
      completedSessions: durations.length,
      totalSessions: sessionMap.size,
      topFrictionFields,
      periodDays: 30,
    };
  },
});
