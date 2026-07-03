import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { requireOwnDiet } from "@/lib/api-auth";
import { buildDietShareUrl, getOrCreateDietShareLink } from "@/lib/diet-share-links";
import { createWhatsAppMessage, getWhatsAppURL } from "@/utils/whatsapp";

const Body = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "diets.whatsapp",
  handler: async ({ body, params, auth, log }) => {
    const dietId = parseInt(String(params.id), 10);
    if (!dietId || Number.isNaN(dietId)) {
      throw new HttpError("bad_request", "Invalid diet ID");
    }

    const { phoneNumber } = body;

    if (!(await requireOwnDiet(dietId, auth))) {
      throw new HttpError("forbidden", "Access denied");
    }

    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      include: {
        client: true,
      },
    });

    if (!diet) {
      throw new HttpError("not_found", "Diet not found");
    }

    const clientName = diet.client
      ? `${diet.client.name} ${diet.client.surname}`.trim()
      : "Değerli Danışanımız";
    const dietDate = diet.tarih
      ? new Date(diet.tarih).toLocaleDateString("tr-TR")
      : "Yeni";
    const share = await getOrCreateDietShareLink({
      dietId,
      dietitianId: auth.user!.id,
    });
    const dietUrl = await buildDietShareUrl(share.token);
    const whatsappUrl = getWhatsAppURL(
      phoneNumber,
      createWhatsAppMessage(clientName, dietDate, dietUrl)
    );

    log.info("whatsapp url generated", { dietId });

    return {
      success: true,
      message: "WhatsApp message sent successfully",
      whatsappUrl,
      dietUrl,
    };
  },
});
