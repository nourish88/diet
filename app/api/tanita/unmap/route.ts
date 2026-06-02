import { z } from "zod";
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
  handler: async ({ body, auth }) => {
    const client = await TanitaMappingService.unmapClientFromTanita(
      body.clientId,
      auth.user!.id,
    );

    return {
      success: true,
      client: {
        id: client.id,
        name: client.name,
        surname: client.surname,
        tanitaMemberId: client.tanitaMemberId,
      },
    };
  },
});
