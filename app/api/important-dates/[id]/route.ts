import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";
import { ImportantDateInput } from "@/schemas/api/important-date";

type Params = { id: string };

function parseId(raw: string) {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

async function findOwn(id: number, dietitianId: number) {
  return prisma.importantDate.findFirst({
    where: { id, dietitianId },
    select: { id: true },
  });
}

export const GET = route<undefined, Params>({
  auth: "dietitian",
  scope: "important-dates.get",
  handler: async ({ params, auth, log }) => {
    try {
      const id = parseId(params.id);
      if (id === null) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid important date ID" }, { status: 400 }),
        );
      }
      const item = await prisma.importantDate.findFirst({
        where: { id, dietitianId: auth.user!.id },
      });
      if (!item) {
        return addCorsHeaders(
          NextResponse.json({ error: "Important date not found" }, { status: 404 }),
        );
      }
      return addCorsHeaders(NextResponse.json(item));
    } catch (err) {
      log.error("get failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to fetch important date" }, { status: 500 }),
      );
    }
  },
});

export const PUT = route<typeof ImportantDateInput, Params>({
  auth: "dietitian",
  schema: ImportantDateInput,
  scope: "important-dates.update",
  handler: async ({ body, params, auth, log }) => {
    try {
      const id = parseId(params.id);
      if (id === null) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid important date ID" }, { status: 400 }),
        );
      }
      const owned = await findOwn(id, auth.user!.id);
      if (!owned) {
        return addCorsHeaders(
          NextResponse.json({ error: "Important date not found" }, { status: 404 }),
        );
      }
      const updated = await prisma.importantDate.update({
        where: { id },
        data: {
          name: body.name,
          message: body.message,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
        },
      });
      invalidate.importantDates(auth.user!.id);
      return addCorsHeaders(NextResponse.json(updated));
    } catch (err) {
      log.error("update failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to update important date" }, { status: 500 }),
      );
    }
  },
});

export const DELETE = route<undefined, Params>({
  auth: "dietitian",
  scope: "important-dates.delete",
  handler: async ({ params, auth, log }) => {
    try {
      const id = parseId(params.id);
      if (id === null) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid important date ID" }, { status: 400 }),
        );
      }
      const owned = await findOwn(id, auth.user!.id);
      if (!owned) {
        return addCorsHeaders(
          NextResponse.json({ error: "Important date not found" }, { status: 404 }),
        );
      }
      const deleted = await prisma.importantDate.delete({ where: { id } });
      invalidate.importantDates(auth.user!.id);
      return addCorsHeaders(NextResponse.json(deleted));
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to delete important date" }, { status: 500 }),
      );
    }
  },
});
