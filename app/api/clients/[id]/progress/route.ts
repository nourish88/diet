import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

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
  auth: "dietitian",
  schema: CreateProgressBody,
  scope: "clients.progress.create",
  handler: async ({ body, params, auth, log }) => {
    try {
      const clientId = parseInt(params.id, 10);
      if (Number.isNaN(clientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Geçersiz danışan ID" }, { status: 400 }),
        );
      }

      const client = await prisma.client.findFirst({
        where: { id: clientId, dietitianId: auth.user!.id },
        select: { id: true, userId: true },
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Danışan bulunamadı" }, { status: 404 }),
        );
      }

      if (body.weight == null && body.bodyFat == null) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "En az bir ölçüm değeri gerekli (kilo veya yağ oranı)" },
            { status: 400 },
          ),
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

      return addCorsHeaders(NextResponse.json(entry, { status: 201 }));
    } catch (err) {
      log.error("create failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Ölçüm kaydedilemedi" }, { status: 500 }),
      );
    }
  },
});
