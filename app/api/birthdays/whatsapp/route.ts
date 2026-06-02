import { z } from "zod";
import { route, HttpError } from "@/lib/api/handler";
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
  cors: true,
  auth: "dietitian",
  schema: Body,
  scope: "birthdays.whatsapp",
  handler: async ({ body, auth }) => {
    const birthdayClients = await getClientsWithBirthdaysToday(auth.user!.id);
    const client = birthdayClients.find((c) => c.id === body.clientId);
    if (!client) {
      throw new HttpError("not_found", "Client not found or not a birthday client");
    }
    if (client.phoneNumber !== body.phoneNumber) {
      throw new HttpError("bad_request", "Phone number does not match client");
    }

    const message = formatBirthdayMessage(client.name);
    const whatsappUrl = generateWhatsAppURL(body.phoneNumber, message);

    return {
      success: true,
      whatsappUrl,
      message,
      clientName: client.name,
    };
  },
});
