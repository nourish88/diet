import { NextResponse } from "next/server";
import { z } from "zod";
import { TanitaMappingService } from "@/services/TanitaMappingService";
import { TanitaProgressService } from "@/services/TanitaProgressService";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const Body = z.object({
  tanitaMemberId: z.coerce.number().int().positive(),
  syncMeasurements: z.boolean().optional(),
});

export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: Body,
  scope: "tanita.create-client",
  handler: async ({ body, auth, log }) => {
    try {
      const { client, tanitaUser } =
        await TanitaMappingService.createClientFromTanita(
          body.tanitaMemberId,
          auth.user!.id,
        );

      let progressSyncResult:
        | { created: number; skipped: number; errors: string[] }
        | null = null;
      if (body.syncMeasurements && client.userId) {
        progressSyncResult = await TanitaProgressService.syncMeasurementsToProgress(
          client.id,
          client.userId,
        );
      }

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          client: {
            id: client.id,
            name: client.name,
            surname: client.surname,
            phoneNumber: client.phoneNumber,
            birthdate: client.birthdate,
            gender: client.gender,
            tanitaMemberId: client.tanitaMemberId,
          },
          tanitaUser: {
            id: tanitaUser.id,
            tanitaMemberId: tanitaUser.tanitaMemberId,
            name: tanitaUser.name,
            surname: tanitaUser.surname,
          },
          progressSync: progressSyncResult,
        }),
      );
    } catch (err) {
      log.error("create-client failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Client oluşturma başarısız" },
          { status: 500 },
        ),
      );
    }
  },
});
