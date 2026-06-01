import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const dietitianId = auth.user.id;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all logs for the last 30 days
    const logs = await prisma.dietFormLog.findMany({
      where: { dietitianId, createdAt: { gte: since } },
      select: { sessionId: true, action: true, fieldName: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // --- Average session duration ---
    const sessionMap = new Map<string, { opened?: Date; saved?: Date }>();
    for (const log of logs) {
      if (!sessionMap.has(log.sessionId)) sessionMap.set(log.sessionId, {});
      const entry = sessionMap.get(log.sessionId)!;
      if (log.action === "form_opened" && !entry.opened) entry.opened = log.createdAt;
      if (log.action === "diet_saved" && !entry.saved) entry.saved = log.createdAt;
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

    // --- Most removed / changed fields ---
    const fieldCounts = new Map<string, number>();
    for (const log of logs) {
      if (
        (log.action === "item_removed" || log.action === "field_changed") &&
        log.fieldName
      ) {
        fieldCounts.set(log.fieldName, (fieldCounts.get(log.fieldName) ?? 0) + 1);
      }
    }
    const topFrictionFields = [...fieldCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, count]) => ({ field, count }));

    // --- Total sessions with saved diets ---
    const completedSessions = durations.length;
    const totalSessions = sessionMap.size;

    return addCorsHeaders(
      NextResponse.json({
        avgMinutes,
        completedSessions,
        totalSessions,
        topFrictionFields,
        periodDays: 30,
      })
    );
  } catch (error) {
    console.error("Error fetching diet logs summary:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Yazma analizi yüklenirken bir hata oluştu" },
        { status: 500 }
      )
    );
  }
}
