import prisma from "@/lib/prisma";
import { PUBLIC_DIETITIAN_NAME } from "@/lib/brand-identity";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";
import { turkeyDateKey } from "@/lib/weekly-check-in";
import type { WaterReminderSlot } from "@/lib/water-reminder";

type PushSub = { id: number; endpoint: string; auth: string; p256dh: string };
type ClientWithPush = {
  id: number;
  name: string;
  surname: string;
  userId: number | null;
  user: {
    id: number;
    notificationPreference: { dietUpdates: boolean } | null;
    pushSubscriptions: PushSub[];
  } | null;
};

export type ClientNotificationRecipient = {
  clientId: number;
  fullName: string;
  userId: number | null;
  subscriptionCount: number;
  dietUpdatesEnabled: boolean;
};

export type ClientNotificationResult = {
  ok: boolean;
  broadcastId?: number;
  sent: number;
  failed: number;
  skipped: number;
  clients: number;
  persisted: number;
};

export const DIETITIAN_MESSAGE_TITLE = "Diyetisyeninizden mesaj var";
export const DAILY_WATER_MESSAGE =
  "Küçük bir su molası zamanı 💧 Bugünkü su hedefinize bir adım daha yaklaşın.";

function formatPushError(error: any): string {
  const status = error?.statusCode;
  const body = typeof error?.body === "string" ? error.body.trim().slice(0, 200) : undefined;
  const message = error?.message || String(error);
  return status ? `[${status}] ${message}${body ? ` - ${body}` : ""}` : message;
}

function isInvalidSubscription(error: any) {
  return error?.statusCode === 404 || error?.statusCode === 410;
}

function fullName(client: Pick<ClientWithPush, "name" | "surname">) {
  return `${client.name} ${client.surname}`.trim();
}

export async function listNotificationRecipients(
  dietitianId: number,
): Promise<ClientNotificationRecipient[]> {
  const clients = await prisma.client.findMany({
    where: { dietitianId, userId: { not: null } },
    orderBy: [{ name: "asc" }, { surname: "asc" }],
    select: {
      id: true,
      name: true,
      surname: true,
      userId: true,
      user: {
        select: {
          id: true,
          notificationPreference: { select: { dietUpdates: true } },
          pushSubscriptions: { select: { id: true } },
        },
      },
    },
  });

  return clients.map((client) => ({
    clientId: client.id,
    fullName: fullName(client),
    userId: client.userId,
    subscriptionCount: client.user?.pushSubscriptions.length ?? 0,
    dietUpdatesEnabled: client.user?.notificationPreference?.dietUpdates ?? true,
  }));
}

async function findClients(
  dietitianId: number,
  clientIds?: number[],
  options: { activeOnly?: boolean } = {},
): Promise<ClientWithPush[]> {
  return prisma.client.findMany({
    where: {
      dietitianId,
      userId: { not: null },
      ...(options.activeOnly ? { isActive: true } : {}),
      ...(clientIds ? { id: { in: clientIds } } : {}),
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      surname: true,
      userId: true,
      user: {
        select: {
          id: true,
          notificationPreference: { select: { dietUpdates: true } },
          pushSubscriptions: {
            select: { id: true, endpoint: true, auth: true, p256dh: true },
          },
        },
      },
    },
  });
}

/**
 * Saves the announcement and every intended recipient before attempting push.
 * Push is only a best-effort delivery channel; the inbox record remains even
 * when configuration, subscription or network delivery fails.
 */
export async function sendClientNotifications({
  dietitianId,
  clientIds,
  body,
}: {
  dietitianId: number;
  clientIds: number[];
  body: string;
}): Promise<ClientNotificationResult> {
  const clients = await findClients(dietitianId, clientIds);

  // Never silently accept IDs that are no longer owned by this dietitian.
  if (clients.length !== new Set(clientIds).size) {
    throw new Error("Bir veya daha fazla danışan bulunamadı ya da erişim yetkiniz yok.");
  }

  const broadcast = await prisma.broadcastMessage.create({
    data: {
      dietitianId,
      dietitianName: PUBLIC_DIETITIAN_NAME,
      title: DIETITIAN_MESSAGE_TITLE,
      message: body,
      recipients: {
        create: clients.map((client) => ({
          clientId: client.id,
          clientName: fullName(client),
          subscriptionCount: client.user?.pushSubscriptions.length ?? 0,
          deliveryStatus:
            !isWebPushConfigured()
              ? "push_unavailable"
              : client.user?.pushSubscriptions.length
                ? "pending"
                : "not_subscribed",
        })),
      },
    },
    include: { recipients: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const client of clients) {
    const recipient = broadcast.recipients.find((item) => item.clientId === client.id)!;
    const subscriptions = client.user?.pushSubscriptions ?? [];
    if (!isWebPushConfigured() || subscriptions.length === 0) {
      skipped++;
      continue;
    }

    let clientSent = 0;
    let clientFailed = 0;
    let lastError: string | null = null;
    for (const subscription of subscriptions) {
      try {
        await sendWebPushNotification(
          {
            endpoint: subscription.endpoint,
            keys: { auth: subscription.auth, p256dh: subscription.p256dh },
          },
          {
            title: broadcast.title,
            body,
            url: `/client/notifications/${recipient.id}`,
            tag: `broadcast-${broadcast.id}-${client.id}`,
            requireInteraction: false,
            data: {
              type: "dietitian_announcement",
              broadcastId: broadcast.id,
              broadcastRecipientId: recipient.id,
              url: `/client/notifications/${recipient.id}`,
            },
          },
        );
        clientSent++;
        sent++;
      } catch (error: any) {
        clientFailed++;
        failed++;
        lastError = formatPushError(error);
        if (isInvalidSubscription(error)) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        }
      }
    }

    await prisma.broadcastRecipient.update({
      where: { id: recipient.id },
      data: {
        sentCount: clientSent,
        failedCount: clientFailed,
        pushSentAt: clientSent > 0 ? new Date() : null,
        errorMessage: lastError,
      },
    });
    // Do not overwrite a very fast service-worker acknowledgement that may
    // already have promoted this recipient to `delivered`.
    await prisma.broadcastRecipient.updateMany({
      where: { id: recipient.id, deliveredAt: null },
      data: {
        deliveryStatus:
          clientSent > 0 && clientFailed > 0 ? "partial" : clientSent > 0 ? "sent" : "failed",
      },
    });
  }

  return {
    ok: true,
    broadcastId: broadcast.id,
    sent,
    failed,
    skipped,
    clients: clients.length,
    persisted: broadcast.recipients.length,
  };
}

async function sendDailyWaterReminder(
  dietitianId: number,
  slot: WaterReminderSlot,
) {
  const clients = await findClients(dietitianId, undefined, { activeOnly: true });
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const dateKey = turkeyDateKey();
  const dedupeKey = `daily-water:${dietitianId}:${dateKey}:${slot}`;
  const existing = await prisma.broadcastMessage.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  if (existing) return { sent, failed, skipped: clients.length, persisted: 0 };

  const broadcast = await prisma.broadcastMessage.create({
    data: {
      dietitianId,
      dietitianName: PUBLIC_DIETITIAN_NAME,
      title: "Su molası 💧",
      message: DAILY_WATER_MESSAGE,
      type: "daily_water",
      dedupeKey,
      recipients: {
        create: clients.map((client) => ({
          clientId: client.id,
          clientName: fullName(client),
          subscriptionCount: client.user?.pushSubscriptions.length ?? 0,
          deliveryStatus: !isWebPushConfigured()
            ? "push_unavailable"
            : client.user?.pushSubscriptions.length
              ? "pending"
              : "not_subscribed",
        })),
      },
    },
    include: { recipients: true },
  });

  for (const client of clients) {
    const recipient = broadcast.recipients.find(
      (item) => item.clientId === client.id,
    );
    if (!recipient) continue;
    const user = client.user;
    if (
      !isWebPushConfigured() ||
      !user ||
      !user.pushSubscriptions.length ||
      user.notificationPreference?.dietUpdates === false
    ) {
      skipped++;
      if (user?.notificationPreference?.dietUpdates === false) {
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: { deliveryStatus: "preference_disabled" },
        });
      }
      continue;
    }
    let clientSent = 0;
    let clientFailed = 0;
    let lastError: string | null = null;
    for (const subscription of user.pushSubscriptions) {
      try {
        await sendWebPushNotification(
          { endpoint: subscription.endpoint, keys: { auth: subscription.auth, p256dh: subscription.p256dh } },
          {
            title: broadcast.title,
            body: DAILY_WATER_MESSAGE,
            url: "/client",
            tag: `daily_water_reminder-${dietitianId}-${client.id}-${dateKey}-${slot}`,
            requireInteraction: false,
            data: {
              type: "daily_water_reminder",
              clientId: client.id,
              broadcastRecipientId: recipient.id,
              url: "/client",
            },
          },
        );
        sent++;
        clientSent++;
      } catch (error: any) {
        failed++;
        clientFailed++;
        lastError = formatPushError(error);
        if (isInvalidSubscription(error)) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        }
      }
    }
    await prisma.broadcastRecipient.update({
      where: { id: recipient.id },
      data: {
        sentCount: clientSent,
        failedCount: clientFailed,
        pushSentAt: clientSent ? new Date() : null,
        deliveryStatus: clientSent
          ? clientFailed
            ? "partial"
            : "sent"
          : "failed",
        errorMessage: lastError,
      },
    });
  }
  return { sent, failed, skipped, persisted: broadcast.recipients.length };
}

export async function sendDailyWaterReminderToAllDietUpdateClients(
  slot: WaterReminderSlot,
) {
  const dietitians = await prisma.user.findMany({
    where: { role: "dietitian", isApproved: true, clients: { some: {} } },
    select: { id: true },
  });
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let persisted = 0;
  for (const dietitian of dietitians) {
    const result = await sendDailyWaterReminder(dietitian.id, slot);
    sent += result.sent;
    failed += result.failed;
    skipped += result.skipped;
    persisted += result.persisted;
  }
  return { sent, failed, skipped, persisted, dietitians: dietitians.length };
}
