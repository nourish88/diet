import { route } from "@/lib/api/handler";
import { listNotificationRecipients } from "@/services/ClientNotificationService";

export const dynamic = "force-dynamic";

export const GET = route({
  auth: "dietitian",
  scope: "notifications.clients",
  handler: async ({ auth }) => {
    const clients = await listNotificationRecipients(auth.user!.id);
    return { clients };
  },
});
