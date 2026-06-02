import prisma from "@/lib/prisma";
import { getCachedImportantDates, invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { ImportantDateInput } from "@/schemas/api/important-date";

export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "important-dates.list",
  handler: async ({ auth }) => {
    return getCachedImportantDates(auth.user!.id);
  },
});

export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: ImportantDateInput,
  scope: "important-dates.create",
  handler: async ({ body, auth }) => {
    const created = await prisma.importantDate.create({
      data: {
        name: body.name.trim(),
        message: body.message.trim(),
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        dietitianId: auth.user!.id,
      },
    });
    invalidate.importantDates(auth.user!.id);
    return ok(created, { status: 201 });
  },
});
