import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { createWhatsAppMessage, getWhatsAppURL } from "@/utils/whatsapp";
import { buildDietShareUrl, getOrCreateDietShareLink } from "@/lib/diet-share-links";

const Body = z.object({
  clientId: z.coerce.number().int().positive(),
  dietId: z.coerce.number().int().positive(),
});

export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "whatsapp.send-diet",
  handler: async ({ body, auth, log }) => {
    const { clientId, dietId } = body;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { phoneNumber: true, name: true, surname: true },
    });
    if (!client?.phoneNumber) {
      throw new HttpError("bad_request", "Client phone number not found");
    }

    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      select: { tarih: true, dietitianId: true, clientId: true },
    });
    if (!diet) {
      throw new HttpError("not_found", "Diet not found");
    }
    if (diet.dietitianId !== auth.user!.id || diet.clientId !== clientId) {
      throw new HttpError("forbidden", "Access denied");
    }

    const clientName = `${client.name} ${client.surname}`;
    const dietDate = diet.tarih
      ? new Date(diet.tarih).toLocaleDateString("tr-TR")
      : "Yeni";
    const share = await getOrCreateDietShareLink({
      dietId,
      dietitianId: auth.user!.id,
    });
    const dietUrl = await buildDietShareUrl(share.token);
    const whatsappURL = getWhatsAppURL(
      client.phoneNumber,
      createWhatsAppMessage(clientName, dietDate, dietUrl),
    );

    log.info("url generated", { clientId, dietId });

    return {
      success: true,
      message: "WhatsApp URL generated successfully",
      whatsappURL,
      clientName,
      dietDate,
      dietUrl,
    };
  },
});
