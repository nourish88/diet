import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

const SubscribeBody = z.object({
  subscription: z.object({
    endpoint: z.string().min(1),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  userId: z.number().int().positive(),
});

const UnsubscribeBody = z.object({
  endpoint: z.string().min(1),
});

/** POST /api/push/subscribe — store/refresh a web-push subscription for the signed-in user. */
export const POST = route({
  cors: true,
  auth: "any",
  schema: SubscribeBody,
  scope: "push.subscribe",
  handler: async ({ body, auth }) => {
    // Assistants must own their subscription under their own user id, not the
    // swapped parent dietitian id. callerId falls back to id for regular users.
    const realUserId = auth.user!.callerId ?? auth.user!.id;
    if (body.userId !== realUserId) {
      throw new HttpError("forbidden", "Forbidden");
    }
    const { endpoint, keys } = body.subscription;
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: realUserId },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: realUserId,
      },
    });

    return { success: true, subscriptionId: subscription.id };
  },
});

/** DELETE /api/push/subscribe — remove a web-push subscription owned by the signed-in user. */
export const DELETE = route({
  cors: true,
  auth: "any",
  schema: UnsubscribeBody,
  scope: "push.unsubscribe",
  handler: async ({ body, auth }) => {
    const realUserId = auth.user!.callerId ?? auth.user!.id;
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint, userId: realUserId },
    });
    return { success: true };
  },
});
