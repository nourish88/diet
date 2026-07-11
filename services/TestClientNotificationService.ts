import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { PUBLIC_DIETITIAN_NAME } from "@/lib/brand-identity";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";

export type TestNotificationType = "water" | "check-in";

const COPY: Record<TestNotificationType, { title: string; message: string }> = {
  water: {
    title: "Test: Su molası 💧",
    message: "Bu, günlük saat 12:00 su hatırlatmasının test bildirimidir.",
  },
  "check-in": {
    title: "Test: Haftalık kontrol 🌿",
    message: "Bu, haftalık check-in zamanlayıcısının test bildirimidir.",
  },
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
}

async function getOrCreateTestCheckIn(client: {
  id: number;
  dietitianId: number | null;
}) {
  const pending = await prisma.weeklyCheckIn.findFirst({
    where: {
      clientId: client.id,
      isTest: true,
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
  });

  if (pending) {
    return prisma.weeklyCheckIn.update({
      where: { id: pending.id },
      data: { sentAt: new Date() },
    });
  }

  return prisma.weeklyCheckIn.create({
    data: {
      clientId: client.id,
      dietitianId: client.dietitianId!,
      weekStart: new Date(),
      isTest: true,
      sentAt: new Date(),
    },
  });
}

export async function sendTestNotificationToClient(
  clientId: number,
  type: TestNotificationType,
) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, isActive: true, userId: { not: null } },
    select: {
      id: true,
      name: true,
      surname: true,
      dietitianId: true,
      dietitian: { select: { name: true, email: true } },
      user: {
        select: {
          notificationPreference: { select: { dietUpdates: true } },
          pushSubscriptions: {
            select: { id: true, endpoint: true, auth: true, p256dh: true },
          },
        },
      },
    },
  });
  if (!client || !client.dietitianId || !client.dietitian) {
    throw new Error("Aktif ve portal hesabıyla eşleşmiş danışan bulunamadı.");
  }

  const copy = COPY[type];
  const testCheckIn =
    type === "check-in"
      ? await getOrCreateTestCheckIn(client)
      : null;
  const actionUrl = testCheckIn ? `/client/check-in/${testCheckIn.id}` : null;
  const broadcast = await prisma.broadcastMessage.create({
    data: {
      dietitianId: client.dietitianId,
      dietitianName: PUBLIC_DIETITIAN_NAME,
      title: copy.title,
      message: copy.message,
      type: `test_${type.replace("-", "_")}`,
      dedupeKey: `test:${type}:${client.id}:${randomUUID()}`,
      recipients: {
        create: {
          clientId: client.id,
          clientName: `${client.name} ${client.surname}`.trim(),
          weeklyCheckInId: testCheckIn?.id,
          actionUrl,
          subscriptionCount: client.user?.pushSubscriptions.length ?? 0,
          deliveryStatus: !isWebPushConfigured()
            ? "push_unavailable"
            : client.user?.pushSubscriptions.length
              ? "pending"
              : "not_subscribed",
        },
      },
    },
    include: { recipients: true },
  });
  const recipient = broadcast.recipients[0];
  const subscriptions = client.user?.pushSubscriptions ?? [];

  if (
    !isWebPushConfigured() ||
    !subscriptions.length ||
    client.user?.notificationPreference?.dietUpdates === false
  ) {
    if (client.user?.notificationPreference?.dietUpdates === false) {
      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: { deliveryStatus: "preference_disabled" },
      });
    }
    return {
      broadcastId: broadcast.id,
      recipientId: recipient.id,
      clientId: client.id,
      persisted: 1,
      sent: 0,
      failed: 0,
      skipped: 1,
    };
  }

  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;
  const url = actionUrl ?? `/client/notifications/${recipient.id}`;
  for (const subscription of subscriptions) {
    try {
      await sendWebPushNotification(
        {
          endpoint: subscription.endpoint,
          keys: { auth: subscription.auth, p256dh: subscription.p256dh },
        },
        {
          title: copy.title,
          body: copy.message,
          url,
          tag: `test-${type}-${recipient.id}`,
          requireInteraction: true,
          data: {
            type: `test_${type.replace("-", "_")}`,
            clientId: client.id,
            broadcastRecipientId: recipient.id,
            url,
          },
        },
      );
      sent++;
    } catch (error: unknown) {
      failed++;
      lastError = formatError(error);
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription
          .delete({ where: { id: subscription.id } })
          .catch(() => undefined);
      }
    }
  }

  await prisma.broadcastRecipient.update({
    where: { id: recipient.id },
    data: {
      sentCount: sent,
      failedCount: failed,
      pushSentAt: sent ? new Date() : null,
      deliveryStatus: sent ? (failed ? "partial" : "sent") : "failed",
      errorMessage: lastError,
    },
  });

  return {
    broadcastId: broadcast.id,
    recipientId: recipient.id,
    clientId: client.id,
    persisted: 1,
    sent,
    failed,
    skipped: 0,
  };
}
