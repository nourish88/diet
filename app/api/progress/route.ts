import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const NumericInput = z.union([z.string(), z.number()]).nullish();

const CreateProgressBody = z.object({
  date: z.string().min(1, "Date is required"),
  weight: NumericInput,
  waist: NumericInput,
  hip: NumericInput,
  bodyFat: NumericInput,
});

function toNum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(String(value));
  return Number.isNaN(num) ? null : num;
}

/**
 * GET /api/progress — progress entries.
 * Client: own entries. Dietitian: requires clientId query param (must own client).
 */
export const GET = route({
  cors: true,
  auth: "any",
  scope: "progress.list",
  handler: async ({ request, auth }) => {
    const user = auth.user!;
    const searchParams = request.nextUrl.searchParams;
    const clientIdParam = searchParams.get("clientId");
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");

    let clientId: number | undefined;
    let userId: number | undefined;

    if (user.role === "dietitian") {
      if (!clientIdParam) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "clientId is required for dietitian" },
            { status: 400 },
          ),
        );
      }
      clientId = parseInt(clientIdParam, 10);
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { dietitianId: true, userId: true },
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 }),
        );
      }
      if (client.dietitianId !== user.id) {
        return addCorsHeaders(
          NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        );
      }
      userId = client.userId || undefined;
    } else if (user.role === "client") {
      const client = await prisma.client.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 }),
        );
      }
      clientId = client.id;
      userId = user.id;
    } else {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid role" }, { status: 403 }),
      );
    }

    if (!clientId || !userId) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client or user not found" }, { status: 404 }),
      );
    }

    const where: Prisma.ProgressEntryWhereInput = { clientId, userId };
    if (dateFromParam || dateToParam) {
      where.date = {};
      if (dateFromParam) where.date.gte = new Date(dateFromParam);
      if (dateToParam) where.date.lte = new Date(dateToParam);
    }

    const entries = await prisma.progressEntry.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return addCorsHeaders(NextResponse.json({ success: true, entries }));
  },
});

/** POST /api/progress — create a progress entry (client only). */
export const POST = route({
  cors: true,
  auth: "client",
  schema: CreateProgressBody,
  scope: "progress.create",
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

      const entry = await prisma.progressEntry.create({
        data: {
          userId: auth.user!.id,
          clientId: client.id,
          date: new Date(body.date),
          weight: toNum(body.weight),
          waist: toNum(body.waist),
          hip: toNum(body.hip),
          bodyFat: toNum(body.bodyFat),
        },
      });

      return addCorsHeaders(
        NextResponse.json({ success: true, entry }, { status: 201 }),
      );
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to create progress entry" },
          { status: 500 },
        ),
      );
    }
  },
});
