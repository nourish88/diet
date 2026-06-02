import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

/**
 * POST /api/diet-logs — create a diet form log entry (dietitian only).
 * Fail-safe: body is read defensively and logging is skipped when disabled.
 */
export const POST = route({
  cors: true,
  auth: "dietitian",
  scope: "diet-logs.create",
  handler: async ({ request, auth, log }) => {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: "diet_form_logging_enabled" },
      });
      if (!config || config.value !== "true") {
        return addCorsHeaders(
          NextResponse.json({ success: true, skipped: true }),
        );
      }

      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const sessionId = body.sessionId as string | undefined;
      const action = body.action as string | undefined;

      if (!sessionId || !action) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Missing required fields: sessionId, action" },
            { status: 400 },
          ),
        );
      }

      const source =
        (body.source as string | undefined) ??
        (sessionId.startsWith("api_") ? "server" : "client");

      const logEntry = await prisma.dietFormLog.create({
        data: {
          dietitianId: auth.user!.id,
          sessionId,
          clientId: (body.clientId as number | undefined) ?? null,
          dietId: (body.dietId as number | undefined) ?? null,
          action,
          fieldName: (body.fieldName as string | undefined) ?? null,
          fieldValue: (body.fieldValue as string | undefined) ?? null,
          previousValue: (body.previousValue as string | undefined) ?? null,
          metadata: (body.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
          source,
        },
      });

      return addCorsHeaders(
        NextResponse.json({ success: true, id: logEntry.id }, { status: 201 }),
      );
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to create log entry" },
          { status: 500 },
        ),
      );
    }
  },
});

/** GET /api/diet-logs — list a dietitian's own diet form logs (filtered). */
export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "diet-logs.list",
  handler: async ({ request, auth, log }) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const sessionId = searchParams.get("sessionId");
      const clientId = searchParams.get("clientId");
      const dietId = searchParams.get("dietId");
      const action = searchParams.get("action");
      const limit = parseInt(searchParams.get("limit") || "100", 10);
      const offset = parseInt(searchParams.get("offset") || "0", 10);

      const where: Prisma.DietFormLogWhereInput = { dietitianId: auth.user!.id };
      if (sessionId) where.sessionId = sessionId;
      if (clientId) where.clientId = parseInt(clientId, 10);
      if (dietId) where.dietId = parseInt(dietId, 10);
      if (action) where.action = action;

      const [logs, total] = await Promise.all([
        prisma.dietFormLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: { dietitian: { select: { id: true, email: true } } },
        }),
        prisma.dietFormLog.count({ where }),
      ]);

      return addCorsHeaders(
        NextResponse.json({ logs, total, limit, offset }),
      );
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 }),
      );
    }
  },
});
