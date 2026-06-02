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
    if (body.userId !== auth.user!.id) {
      throw new HttpError("forbidden", "Forbidden");
    }
    const { endpoint, keys } = body.subscription;
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: body.userId },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: body.userId,
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
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint, userId: auth.user!.id },
    });
    return { success: true };
  },
});
