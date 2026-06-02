import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

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

function parseEntryId(raw: string): number {
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) throw new HttpError("bad_request", "Invalid entry ID");
  return id;
}

async function assertOwned(entryId: number, userId: number) {
  const existing = await prisma.progressEntry.findUnique({
    where: { id: entryId },
    select: { userId: true },
  });
  if (!existing) throw new HttpError("not_found", "Entry not found");
  if (existing.userId !== userId) throw new HttpError("forbidden", "Forbidden");
}

/** PUT /api/progress/[id] — update a progress entry (client only, owner). */
export const PUT = route<typeof UpdateProgressBody, Params>({
  cors: true,
  auth: "client",
  schema: UpdateProgressBody,
  scope: "progress.update",
  handler: async ({ body, params, auth }) => {
    const entryId = parseEntryId(params.id);
    await assertOwned(entryId, auth.user!.id);

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

    return { success: true, entry };
  },
});

/** DELETE /api/progress/[id] — delete a progress entry (client only, owner). */
export const DELETE = route<undefined, Params>({
  cors: true,
  auth: "client",
  scope: "progress.delete",
  handler: async ({ params, auth }) => {
    const entryId = parseEntryId(params.id);
    await assertOwned(entryId, auth.user!.id);
    await prisma.progressEntry.delete({ where: { id: entryId } });
    return { success: true };
  },
});
