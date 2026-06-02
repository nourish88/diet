import { route } from "@/lib/api/handler";
import { getClientsWithBirthdaysToday } from "@/services/BirthdayService";

/** GET /api/birthdays/today — clients with birthdays today (GMT+3), dietitian only. */
export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "birthdays.today",
  handler: async ({ auth }) => {
    const birthdayClients = await getClientsWithBirthdaysToday(auth.user!.id);
    const clients = birthdayClients.map((client) => ({
      id: client.id,
      name: client.name,
      surname: client.surname,
      phoneNumber: client.phoneNumber,
      birthdate: client.birthdate ? client.birthdate.toISOString() : null,
    }));
    return { success: true, clients, count: clients.length };
  },
});
