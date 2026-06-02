import { z } from "zod";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { route, HttpError } from "@/lib/api/handler";

const Body = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "diets.whatsapp",
  handler: async ({ body, params, log }) => {
    const dietId = parseInt(String(params.id), 10);
    if (!dietId || Number.isNaN(dietId)) {
      throw new HttpError("bad_request", "Invalid diet ID");
    }

    const { phoneNumber } = body;

    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      include: {
        client: true,
        oguns: { include: { items: true } },
      },
    });

    if (!diet) {
      throw new HttpError("not_found", "Diet not found");
    }

    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const dietReportUrl = `${protocol}://${host}/api/diets/${dietId}/pdf`;

    const message =
      `Merhaba ${diet.client?.name || "Değerli Danışanımız"},\n\n` +
      `Beslenme programınız hazır. Aşağıdaki linkten ulaşabilirsiniz:\n\n` +
      `${dietReportUrl}\n\n` +
      `İyi günler dileriz.`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    log.info("whatsapp url generated", { dietId });

    return {
      success: true,
      message: "WhatsApp message sent successfully",
      whatsappUrl,
    };
  },
});
