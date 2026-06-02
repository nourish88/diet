import { NextResponse } from "next/server";
import { z } from "zod";
import { addCorsHeaders } from "@/lib/cors";
import { TanitaMappingService } from "@/services/TanitaMappingService";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const Body = z.object({
  clientId: z.coerce.number().int().positive(),
});

export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: Body,
  scope: "tanita.unmap",
  handler: async ({ body, auth, log }) => {
    try {
      const client = await TanitaMappingService.unmapClientFromTanita(
        body.clientId,
        auth.user!.id,
      );

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          client: {
            id: client.id,
            name: client.name,
            surname: client.surname,
            tanitaMemberId: client.tanitaMemberId,
          },
        }),
      );
    } catch (err) {
      log.error("unmap failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: err instanceof Error ? err.message : "Eşleşme kaldırma başarısız" },
          { status: 500 },
        ),
      );
    }
  },
});
