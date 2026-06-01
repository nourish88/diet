import { NextResponse } from "next/server";
import { z } from "zod";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";
import {
  formatBirthdayMessage,
  generateWhatsAppURL,
  getClientsWithBirthdaysToday,
} from "@/services/BirthdayService";

const Body = z.object({
  clientId: z.number().int().positive(),
  phoneNumber: z.string().min(1),
});

/** POST /api/birthdays/whatsapp — generate WhatsApp deep link (dietitian only). */
export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "birthdays.whatsapp",
  handler: async ({ body, auth, log }) => {
    try {
      const birthdayClients = await getClientsWithBirthdaysToday(auth.user!.id);
      const client = birthdayClients.find((c) => c.id === body.clientId);
      if (!client) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Client not found or not a birthday client" },
            { status: 404 },
          ),
        );
      }
      if (client.phoneNumber !== body.phoneNumber) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Phone number does not match client" },
            { status: 400 },
          ),
        );
      }

      const message = formatBirthdayMessage(client.name);
      const whatsappUrl = generateWhatsAppURL(body.phoneNumber, message);

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          whatsappUrl,
          message,
          clientName: client.name,
        }),
      );
    } catch (err) {
      log.error("whatsapp failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to generate WhatsApp URL" },
          { status: 500 },
        ),
      );
    }
  },
});
