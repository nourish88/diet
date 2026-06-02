import { z } from "zod";
import { TanitaProgressService } from "@/services/TanitaProgressService";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const Body = z.object({
  clientId: z.coerce.number().int().positive(),
});

export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: Body,
  scope: "tanita.sync-measurements",
  handler: async ({ body, auth }) => {
    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
    });

    if (!client) throw new HttpError("not_found", "Client bulunamadı");
    if (client.dietitianId !== auth.user!.id) {
      throw new HttpError("forbidden", "Bu danışan size ait değil");
    }
    if (!client.tanitaMemberId) {
      throw new HttpError("bad_request", "Client Tanita ile eşleştirilmemiş");
    }

    const syncResult = await TanitaProgressService.syncMeasurementsToProgress(
      body.clientId,
      client.userId || undefined,
    );

    return {
      success: true,
      clientId: body.clientId,
      syncResult,
    };
  },
});
