import { NextResponse } from "next/server";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";
import { getClientsWithBirthdaysToday } from "@/services/BirthdayService";

/**
 * GET /api/birthdays/today — clients with birthdays today (GMT+3), dietitian only.
 */
export const GET = route({
  auth: "dietitian",
  scope: "birthdays.today",
  handler: async ({ auth, log }) => {
    try {
      const birthdayClients = await getClientsWithBirthdaysToday(auth.user!.id);
      const clients = birthdayClients.map((client) => ({
        id: client.id,
        name: client.name,
        surname: client.surname,
        phoneNumber: client.phoneNumber,
        birthdate: client.birthdate ? client.birthdate.toISOString() : null,
      }));
      return addCorsHeaders(
        NextResponse.json({ success: true, clients, count: clients.length }),
      );
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to fetch birthday clients" }, { status: 500 }),
      );
    }
  },
});
