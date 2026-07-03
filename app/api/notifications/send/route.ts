import { z } from "zod";
import { route, HttpError } from "@/lib/api/handler";
import { sendClientNotifications } from "@/services/ClientNotificationService";

const Body = z.object({
  clientIds: z.array(z.number().int().positive()).min(1),
  message: z.string().trim().min(1).max(500),
});

export const POST = route({
  auth: "dietitian",
  schema: Body,
  scope: "notifications.send",
  handler: async ({ auth, body }) => {
    const result = await sendClientNotifications({
      dietitianId: auth.user!.id,
      clientIds: body.clientIds,
      body: body.message,
      type: "dietitian_message",
      url: "/client",
      respectDietUpdatesPreference: false,
    });

    if (!result.ok) {
      const message =
        result.reason === "push-not-configured"
          ? "Sunucuda web push ayarları eksik."
          : "Seçilen danışanlarda aktif bildirim aboneliği bulunamadı.";
      throw new HttpError("bad_request", message, result);
    }

    return result;
  },
});
