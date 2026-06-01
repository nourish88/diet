import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";
import { CreateExerciseLogInput } from "@/schemas/api/exercise";

export const dynamic = "force-dynamic";

/**
 * GET /api/exercises
 *  - dietitian: requires `clientId` (must own that client)
 *  - client:    returns own logs (clientId inferred from auth)
 */
export const GET = route({
  auth: "any",
  scope: "exercises.list",
  handler: async ({ request, auth, log }) => {
    try {
      const sp = request.nextUrl.searchParams;
      const dateFrom = sp.get("dateFrom");
      const dateTo = sp.get("dateTo");

      let clientId: number | undefined;
      let userId: number | undefined;

      if (auth.user!.role === "dietitian") {
        const clientIdParam = sp.get("clientId");
        if (!clientIdParam) {
          return addCorsHeaders(
            NextResponse.json(
              { error: "clientId is required for dietitian" },
              { status: 400 },
            ),
          );
        }
        clientId = parseInt(clientIdParam, 10);
        if (Number.isNaN(clientId)) {
          return addCorsHeaders(
            NextResponse.json({ error: "Invalid clientId" }, { status: 400 }),
          );
        }
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          select: { dietitianId: true, userId: true },
        });
        if (!client) {
          return addCorsHeaders(
            NextResponse.json({ error: "Client not found" }, { status: 404 }),
          );
        }
        if (client.dietitianId !== auth.user!.id) {
          return addCorsHeaders(
            NextResponse.json({ error: "Forbidden" }, { status: 403 }),
          );
        }
        userId = client.userId ?? undefined;
      } else {
        // client role
        const client = await prisma.client.findUnique({
          where: { userId: auth.user!.id },
          select: { id: true },
        });
        if (!client) {
          return addCorsHeaders(
            NextResponse.json({ error: "Client not found" }, { status: 404 }),
          );
        }
        clientId = client.id;
        userId = auth.user!.id;
      }

      if (!clientId || !userId) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client or user not found" }, { status: 404 }),
        );
      }

      const where: Prisma.ExerciseLogWhereInput = { clientId, userId };
      if (dateFrom || dateTo) {
        where.date = {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        };
      }

      const logs = await prisma.exerciseLog.findMany({
        where,
        include: { definition: true },
        orderBy: { date: "desc" },
      });

      return addCorsHeaders(NextResponse.json({ success: true, logs }));
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to fetch exercise logs" },
          { status: 500 },
        ),
      );
    }
  },
});

/**
 * POST /api/exercises (client only)
 */
export const POST = route({
  auth: "client",
  schema: CreateExerciseLogInput,
  scope: "exercises.create",
  handler: async ({ body, auth, log }) => {
    try {
      const client = await prisma.client.findUnique({
        where: { userId: auth.user!.id },
        select: { id: true },
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 }),
        );
      }

      const created = await prisma.exerciseLog.create({
        data: {
          userId: auth.user!.id,
          clientId: client.id,
          date: new Date(body.date),
          exerciseTypeId: body.exerciseTypeId ?? null,
          description: body.description ?? null,
          duration: body.duration ?? null,
          steps: body.steps ?? null,
        },
        include: { definition: true },
      });

      return addCorsHeaders(
        NextResponse.json({ success: true, log: created }, { status: 201 }),
      );
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to create exercise log" },
          { status: 500 },
        ),
      );
    }
  },
});
