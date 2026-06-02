import { NextResponse } from "next/server";
import { z } from "zod";
import { TanitaProgressService } from "@/services/TanitaProgressService";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const Body = z.object({
  clientId: z.coerce.number().int().positive(),
});

export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: Body,
  scope: "tanita.sync-measurements",
  handler: async ({ body, auth, log }) => {
    try {
      const client = await prisma.client.findUnique({
        where: { id: body.clientId },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client bulunamadı" }, { status: 404 }),
        );
      }
      if (client.dietitianId !== auth.user!.id) {
        return addCorsHeaders(
          NextResponse.json({ error: "Bu danışan size ait değil" }, { status: 403 }),
        );
      }
      if (!client.tanitaMemberId) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Client Tanita ile eşleştirilmemiş" },
            { status: 400 },
          ),
        );
      }

      const syncResult = await TanitaProgressService.syncMeasurementsToProgress(
        body.clientId,
        client.userId || undefined,
      );

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          clientId: body.clientId,
          syncResult,
        }),
      );
    } catch (err) {
      log.error("sync failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Ölçüm sync başarısız" },
          { status: 500 },
        ),
      );
    }
  },
});
