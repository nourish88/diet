import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

type Params = { id: string };

const NumericInput = z.union([z.string(), z.number()]).nullish();

const UpdateProgressBody = z.object({
  date: z.string().optional().nullable(),
  weight: NumericInput,
  waist: NumericInput,
  hip: NumericInput,
  bodyFat: NumericInput,
});

/** When the field is absent, leave it unchanged; otherwise coerce to number or null. */
function toUpdateNum(
  value: string | number | null | undefined,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const num = parseFloat(String(value));
  return Number.isNaN(num) ? null : num;
}

/** PUT /api/progress/[id] — update a progress entry (client only, owner). */
export const PUT = route<typeof UpdateProgressBody, Params>({
  auth: "client",
  schema: UpdateProgressBody,
  scope: "progress.update",
  handler: async ({ body, params, auth, log }) => {
    try {
      const entryId = parseInt(params.id, 10);
      if (Number.isNaN(entryId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid entry ID" }, { status: 400 }),
        );
      }

      const existing = await prisma.progressEntry.findUnique({
        where: { id: entryId },
        select: { userId: true },
      });
      if (!existing) {
        return addCorsHeaders(
          NextResponse.json({ error: "Entry not found" }, { status: 404 }),
        );
      }
      if (existing.userId !== auth.user!.id) {
        return addCorsHeaders(
          NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        );
      }

      const entry = await prisma.progressEntry.update({
        where: { id: entryId },
        data: {
          date: body.date ? new Date(body.date) : undefined,
          weight: toUpdateNum(body.weight),
          waist: toUpdateNum(body.waist),
          hip: toUpdateNum(body.hip),
          bodyFat: toUpdateNum(body.bodyFat),
        },
      });

      return addCorsHeaders(NextResponse.json({ success: true, entry }));
    } catch (err) {
      log.error("update failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to update progress entry" },
          { status: 500 },
        ),
      );
    }
  },
});

/** DELETE /api/progress/[id] — delete a progress entry (client only, owner). */
export const DELETE = route<undefined, Params>({
  auth: "client",
  scope: "progress.delete",
  handler: async ({ params, auth, log }) => {
    try {
      const entryId = parseInt(params.id, 10);
      if (Number.isNaN(entryId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid entry ID" }, { status: 400 }),
        );
      }

      const existing = await prisma.progressEntry.findUnique({
        where: { id: entryId },
        select: { userId: true },
      });
      if (!existing) {
        return addCorsHeaders(
          NextResponse.json({ error: "Entry not found" }, { status: 404 }),
        );
      }
      if (existing.userId !== auth.user!.id) {
        return addCorsHeaders(
          NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        );
      }

      await prisma.progressEntry.delete({ where: { id: entryId } });

      return addCorsHeaders(NextResponse.json({ success: true }));
    } catch (err) {
      log.error("delete failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to delete progress entry" },
          { status: 500 },
        ),
      );
    }
  },
});
