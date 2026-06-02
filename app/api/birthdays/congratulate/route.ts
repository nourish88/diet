import { z } from "zod";
import { route } from "@/lib/api/handler";
import { markAsCongratulated } from "@/services/BirthdayService";

const Body = z.object({
  clientId: z.number().int().positive(),
});

/** POST /api/birthdays/congratulate — mark a client as congratulated today (dietitian only). */
export const POST = route({
  cors: true,
  auth: "dietitian",
  schema: Body,
  scope: "birthdays.congratulate",
  handler: async ({ body, auth }) => {
    await markAsCongratulated(body.clientId, auth.user!.id);
    return { success: true };
  },
});
