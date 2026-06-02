import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";

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
    const sp = request.nextUrl.searchParams;
    const clientIdParam = sp.get("clientId");
    const dateFromParam = sp.get("dateFrom");
    const dateToParam = sp.get("dateTo");

    let clientId: number | undefined;
    let userId: number | undefined;

    if (user.role === "dietitian") {
      if (!clientIdParam) {
        throw new HttpError("bad_request", "clientId is required for dietitian");
      }
      clientId = parseInt(clientIdParam, 10);
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { dietitianId: true, userId: true },
      });
      if (!client) throw new HttpError("not_found", "Client not found");
      if (client.dietitianId !== user.id) {
        throw new HttpError("forbidden", "Forbidden");
      }
      userId = client.userId ?? undefined;
    } else {
      const client = await prisma.client.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!client) throw new HttpError("not_found", "Client not found");
      clientId = client.id;
      userId = user.id;
    }

    if (!clientId || !userId) {
      throw new HttpError("not_found", "Client or user not found");
    }

    const where: Prisma.ProgressEntryWhereInput = { clientId, userId };
    if (dateFromParam || dateToParam) {
      where.date = {
        ...(dateFromParam ? { gte: new Date(dateFromParam) } : {}),
        ...(dateToParam ? { lte: new Date(dateToParam) } : {}),
      };
    }

    const entries = await prisma.progressEntry.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return { success: true, entries };
  },
});

/** POST /api/progress — create a progress entry (client only). */
export const POST = route({
  cors: true,
  auth: "client",
  schema: CreateProgressBody,
  scope: "progress.create",
  handler: async ({ body, auth }) => {
    const client = await prisma.client.findUnique({
      where: { userId: auth.user!.id },
      select: { id: true },
    });
    if (!client) throw new HttpError("not_found", "Client not found");

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

    return ok({ success: true, entry }, { status: 201 });
  },
});
