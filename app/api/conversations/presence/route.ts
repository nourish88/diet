import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

const ACTIVE_THRESHOLD_MS = 30 * 1000;

const PresenceBody = z.object({
  dietId: z.number().int().positive(),
  isActive: z.boolean().optional(),
  source: z.string().nullish(),
});

export const POST = route({
  cors: true,
  auth: "any",
  schema: PresenceBody,
  scope: "presence.update",
  handler: async ({ body, auth, log }) => {
    try {
      const presence = await prisma.conversationPresence.upsert({
        where: { userId_dietId: { userId: auth.user!.id, dietId: body.dietId } },
        update: {
          isActive: Boolean(body.isActive),
          source: body.source ?? null,
        },
        create: {
          userId: auth.user!.id,
          dietId: body.dietId,
          isActive: Boolean(body.isActive),
          source: body.source ?? null,
        },
      });

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          presence: {
            userId: presence.userId,
            dietId: presence.dietId,
            isActive: presence.isActive,
            source: presence.source,
            lastActiveAt: presence.lastActiveAt,
          },
        }),
      );
    } catch (err) {
      log.error("update failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to update presence" }, { status: 500 }),
      );
    }
  },
});

export const GET = route({
  cors: true,
  auth: "any",
  scope: "presence.get",
  handler: async ({ request, auth, log }) => {
    try {
      const dietIdParam = request.nextUrl.searchParams.get("dietId");
      if (!dietIdParam) {
        return addCorsHeaders(
          NextResponse.json({ error: "dietId query param required" }, { status: 400 }),
        );
      }
      const dietId = parseInt(dietIdParam, 10);
      if (Number.isNaN(dietId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid dietId" }, { status: 400 }),
        );
      }

      const records = await prisma.conversationPresence.findMany({
        where: { dietId, userId: auth.user!.id },
      });

      const now = Date.now();
      const isActive = records.some(
        (presence) =>
          presence.isActive &&
          now - new Date(presence.lastActiveAt).getTime() <= ACTIVE_THRESHOLD_MS,
      );

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          isActive,
          records: records.map((presence) => ({
            dietId: presence.dietId,
            userId: presence.userId,
            isActive: presence.isActive,
            source: presence.source,
            lastActiveAt: presence.lastActiveAt,
          })),
        }),
      );
    } catch (err) {
      log.error("get failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to fetch presence" }, { status: 500 }),
      );
    }
  },
});
