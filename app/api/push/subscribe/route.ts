import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

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
  auth: "any",
  schema: SubscribeBody,
  scope: "push.subscribe",
  handler: async ({ body, auth, log }) => {
    try {
      if (body.userId !== auth.user!.id) {
        return addCorsHeaders(
          NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        );
      }

      const { endpoint, keys } = body.subscription;
      const subscription = await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh: keys.p256dh, auth: keys.auth, userId: body.userId },
        create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: body.userId },
      });

      return addCorsHeaders(
        NextResponse.json({ success: true, subscriptionId: subscription.id }),
      );
    } catch (err) {
      log.error("subscribe failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to store subscription" }, { status: 500 }),
      );
    }
  },
});

/** DELETE /api/push/subscribe — remove a web-push subscription owned by the signed-in user. */
export const DELETE = route({
  auth: "any",
  schema: UnsubscribeBody,
  scope: "push.unsubscribe",
  handler: async ({ body, auth, log }) => {
    try {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: body.endpoint, userId: auth.user!.id },
      });
      return addCorsHeaders(NextResponse.json({ success: true }));
    } catch (err) {
      log.error("unsubscribe failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 }),
      );
    }
  },
});
