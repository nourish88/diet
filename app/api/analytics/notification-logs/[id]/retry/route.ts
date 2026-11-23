import { z } from "zod";
import { HttpError, route } from "@/lib/api/handler";
import { readNotificationForRetry, retryNotification } from "@/services/NotificationRetryService";

function notificationId(value: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError("bad_request", "Bildirim bulunamadı.");
  return id;
}

export const GET = route({
  auth: "dietitian", scope: "notification-retry.read",
  handler: async ({ params, user }) => {
    const source = await readNotificationForRetry(notificationId(params.id), user!.id);
    return { receivedAt: source.receivedAt, attempt: source.retries[0] ?? null };
  },
});

export const POST = route({
  auth: "dietitian", scope: "notification-retry.send",
  schema: z.object({ previousAttemptId: z.number().int().nonnegative() }),
  handler: ({ params, user, body }) => retryNotification(notificationId(params.id), user!.id, body.previousAttemptId),
});
