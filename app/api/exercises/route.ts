import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { CreateExerciseLogInput } from "@/schemas/api/exercise";

export const dynamic = "force-dynamic";

/**
 * GET /api/exercises
 *  - dietitian: requires `clientId` (must own that client)
 *  - client:    returns own logs (clientId inferred from auth)
 */
export const GET = route({
  cors: true,
  auth: "any",
  scope: "exercises.list",
  handler: async ({ request, auth }) => {
    const sp = request.nextUrl.searchParams;
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");

    let clientId: number | undefined;
    let userId: number | undefined;

    if (auth.user!.role === "dietitian") {
      const clientIdParam = sp.get("clientId");
      if (!clientIdParam) {
        throw new HttpError("bad_request", "clientId is required for dietitian");
      }
      clientId = parseInt(clientIdParam, 10);
      if (Number.isNaN(clientId)) {
        throw new HttpError("bad_request", "Invalid clientId");
      }
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { dietitianId: true, userId: true },
      });
      if (!client) throw new HttpError("not_found", "Client not found");
      if (client.dietitianId !== auth.user!.id) {
        throw new HttpError("forbidden", "Forbidden");
      }
      userId = client.userId ?? undefined;
    } else {
      const client = await prisma.client.findUnique({
        where: { userId: auth.user!.id },
        select: { id: true },
      });
      if (!client) throw new HttpError("not_found", "Client not found");
      clientId = client.id;
      userId = auth.user!.id;
    }

    if (!clientId || !userId) {
      throw new HttpError("not_found", "Client or user not found");
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

    return { success: true, logs };
  },
});

/**
 * POST /api/exercises (client only)
 */
export const POST = route({
  cors: true,
  auth: "client",
  schema: CreateExerciseLogInput,
  scope: "exercises.create",
  handler: async ({ body, auth }) => {
    const client = await prisma.client.findUnique({
      where: { userId: auth.user!.id },
      select: { id: true },
    });
    if (!client) throw new HttpError("not_found", "Client not found");

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

    return ok({ success: true, log: created }, { status: 201 });
  },
});
