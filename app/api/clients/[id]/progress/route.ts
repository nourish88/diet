import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";

type Params = { id: string };

const NumericInput = z.union([z.string(), z.number()]).nullish();

const CreateProgressBody = z.object({
  date: z.string().nullish(),
  weight: NumericInput,
  bodyFat: NumericInput,
  waist: NumericInput,
  hip: NumericInput,
});

function toNum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = parseFloat(String(value));
  return Number.isNaN(num) ? null : num;
}

/** POST /api/clients/[id]/progress — record a measurement for a client (dietitian, owner). */
export const POST = route<typeof CreateProgressBody, Params>({
  cors: true,
  auth: "dietitian",
  schema: CreateProgressBody,
  scope: "clients.progress.create",
  handler: async ({ body, params, auth }) => {
    const clientId = parseInt(params.id, 10);
    if (Number.isNaN(clientId)) {
      throw new HttpError("bad_request", "Geçersiz danışan ID");
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, dietitianId: auth.user!.id },
      select: { id: true, userId: true },
    });
    if (!client) throw new HttpError("not_found", "Danışan bulunamadı");

    if (body.weight == null && body.bodyFat == null) {
      throw new HttpError(
        "bad_request",
        "En az bir ölçüm değeri gerekli (kilo veya yağ oranı)",
      );
    }

    const entry = await prisma.progressEntry.create({
      data: {
        clientId: client.id,
        userId: client.userId ?? auth.user!.id,
        date: body.date ? new Date(body.date) : new Date(),
        weight: toNum(body.weight),
        bodyFat: toNum(body.bodyFat),
        waist: toNum(body.waist),
        hip: toNum(body.hip),
      },
    });

    return ok(entry, { status: 201 });
  },
});
