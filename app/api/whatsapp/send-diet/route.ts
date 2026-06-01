import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { createWhatsAppMessage, getWhatsAppURL } from "@/utils/whatsapp";

const Body = z.object({
  clientId: z.coerce.number().int().positive(),
  dietId: z.coerce.number().int().positive(),
});

export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "whatsapp.send-diet",
  handler: async ({ body, log }) => {
    const { clientId, dietId } = body;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { phoneNumber: true, name: true, surname: true },
    });
    if (!client?.phoneNumber) {
      return NextResponse.json(
        { error: "Client phone number not found" },
        { status: 400 },
      );
    }

    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      select: { tarih: true },
    });
    if (!diet) {
      return NextResponse.json({ error: "Diet not found" }, { status: 404 });
    }

    const clientName = `${client.name} ${client.surname}`;
    const dietDate = diet.tarih
      ? new Date(diet.tarih).toLocaleDateString("tr-TR")
      : "Yeni";
    const whatsappURL = getWhatsAppURL(
      client.phoneNumber,
      createWhatsAppMessage(clientName, dietDate),
    );

    log.info("url generated", { clientId, dietId });

    return NextResponse.json({
      success: true,
      message: "WhatsApp URL generated successfully",
      whatsappURL,
      clientName,
      dietDate,
    });
  },
});
