import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { PushDeviceReportSchema } from "@/lib/push-device";
import { buildPushDeviceInfo } from "@/lib/push-device-server";
import { isLoggingEnabled } from "@/lib/logging-settings";

const SubscribeBody = z.object({
  subscription: z.object({
    endpoint: z.string().min(1),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  userId: z.number().int().positive(),
  device: PushDeviceReportSchema.optional(),
  previousEndpoint: z.string().min(1).optional(),
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
  handler: async ({ body, auth, request }) => {
    // Assistants must own their subscription under their own user id, not the
    // swapped parent dietitian id. callerId falls back to id for regular users.
    const realUserId = auth.user!.callerId ?? auth.user!.id;
    if (body.userId !== realUserId) {
      throw new HttpError("forbidden", "Forbidden");
    }
    const { endpoint, keys } = body.subscription;
    const deviceInfo = buildPushDeviceInfo(request.headers.get("user-agent"), body.device);
    const registration = {
      where: { endpoint },
      select: { id: true } as const,
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: realUserId, deviceInfo },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: realUserId,
        deviceInfo,
      },
    };

    const previousEndpoint = body.previousEndpoint;
    const recordDelivery = await isLoggingEnabled(prisma, "notification_logging_enabled");
    const subscription = previousEndpoint && previousEndpoint !== endpoint
      ? await prisma.$transaction(async tx => {
          const saved = await tx.pushSubscription.upsert(registration);
          const where = { endpoint: previousEndpoint, userId: realUserId };
          const previous = await tx.pushSubscription.findFirst({ where, select: { id: true } });
          if (previous) {
            if (recordDelivery) await tx.notificationLog.updateMany({
              where: { userId: realUserId, OR: [{ subscriptionId: previous.id, replacementSubscriptionId: null }, { replacementSubscriptionId: previous.id }] },
              data: { replacementSubscriptionId: saved.id },
            });
            await tx.pushSubscription.deleteMany({ where });
          }
          return saved;
        })
      : await prisma.pushSubscription.upsert(registration);
    if (!recordDelivery) return { success: true, subscriptionId: subscription.id, needsDeliveryCheck: false };
    // Only this account and endpoint's recent accepted sends are relevant.
    const recent: { sentAt: Date; receivedAt: Date | null }[] = await prisma.notificationLog.findMany({
      where: {
        userId: realUserId, subscriptionId: subscription.id, status: "success",
        sentAt: { gte: new Date(Date.now() - 3 * 86400000) },
      },
      select: { receivedAt: true, sentAt: true },
      orderBy: [{ sentAt: "desc" }, { id: "desc" }],
      take: 3,
    }).catch(() => []); // Optional diagnostics must not fail an already saved registration.
    const cutoff = Date.now() - 15 * 60000;
    const needsDeliveryCheck = recent.length === 3 && recent.every(
      (log) => !log.receivedAt && log.sentAt.getTime() <= cutoff,
    );
    return { success: true, subscriptionId: subscription.id, needsDeliveryCheck };
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
