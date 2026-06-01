import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { getCachedImportantDates, invalidate } from "@/lib/cache";
import { route } from "@/lib/api/handler";
import { ImportantDateInput } from "@/schemas/api/important-date";

export const GET = route({
  auth: "dietitian",
  scope: "important-dates.list",
  handler: async ({ auth, log }) => {
    try {
      const items = await getCachedImportantDates(auth.user!.id);
      return addCorsHeaders(NextResponse.json(items));
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Önemli tarihler yüklenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});

export const POST = route({
  auth: "dietitian",
  schema: ImportantDateInput,
  scope: "important-dates.create",
  handler: async ({ body, auth, log }) => {
    try {
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
      return addCorsHeaders(NextResponse.json(created, { status: 201 }));
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Önemli tarih oluşturulurken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});
