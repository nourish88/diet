import prisma from "@/lib/prisma";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";

type PushSub = {
  id: number;
  endpoint: string;
  auth: string;
  p256dh: string;
};

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
  sent: number;
  failed: number;
  skipped: number;
  clients: number;
  reason?: "push-not-configured" | "no-recipients";
};

export const DIETITIAN_MESSAGE_TITLE = "Diyetisyeninizden mesaj var";
export const DAILY_WATER_MESSAGE = "Su içmeyi ihmal etmiyoruz değil mi";

function formatPushError(error: any): string {
  const status = error?.statusCode;
  const body =
    typeof error?.body === "string" ? error.body.trim().slice(0, 200) : undefined;
  const message = error?.message || String(error);
  if (status && body) return `[${status}] ${message} - ${body}`;
  if (status) return `[${status}] ${message}`;
  return message;
}

function isInvalidSubscription(error: any) {
  return error?.statusCode === 404 || error?.statusCode === 410;
}

function dietUpdatesEnabled(client: ClientWithPush) {
  return client.user?.notificationPreference?.dietUpdates ?? true;
}

export async function listNotificationRecipients(
  dietitianId: number
): Promise<ClientNotificationRecipient[]> {
  const clients = await prisma.client.findMany({
    where: {
      dietitianId,
      userId: { not: null },
    },
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
    fullName: `${client.name} ${client.surname}`.trim(),
    userId: client.userId,
    subscriptionCount: client.user?.pushSubscriptions.length ?? 0,
    dietUpdatesEnabled: client.user?.notificationPreference?.dietUpdates ?? true,
  }));
}

async function findClientsForNotification(
  dietitianId: number,
  clientIds?: number[]
): Promise<ClientWithPush[]> {
  return prisma.client.findMany({
    where: {
      dietitianId,
      userId: { not: null },
      ...(clientIds ? { id: { in: clientIds } } : {}),
    },
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

export async function sendClientNotifications({
  dietitianId,
  clientIds,
  body,
  type = "dietitian_message",
  url = "/client",
  respectDietUpdatesPreference = true,
}: {
  dietitianId: number;
  clientIds?: number[];
  body: string;
  type?: "dietitian_message" | "daily_water_reminder";
  url?: string;
  respectDietUpdatesPreference?: boolean;
}): Promise<ClientNotificationResult> {
  if (!isWebPushConfigured()) {
    return { ok: false, sent: 0, failed: 0, skipped: 0, clients: 0, reason: "push-not-configured" };
  }

  const clients = await findClientsForNotification(dietitianId, clientIds);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const client of clients) {
    const user = client.user;
    if (!user || user.pushSubscriptions.length === 0) {
      skipped++;
      continue;
    }

    if (respectDietUpdatesPreference && !dietUpdatesEnabled(client)) {
      skipped++;
      continue;
    }

    const tag = `${type}-${dietitianId}-${client.id}-${new Date().toISOString().slice(0, 10)}`;
    for (const subscription of user.pushSubscriptions) {
      const logEntry = await prisma.notificationLog.create({
        data: {
          userId: user.id,
          clientId: client.id,
          type,
          title: DIETITIAN_MESSAGE_TITLE,
          body,
          status: "success",
        },
      });

      try {
        await sendWebPushNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          },
          {
            title: DIETITIAN_MESSAGE_TITLE,
            body,
            url,
            tag,
            requireInteraction: false,
            data: {
              type,
              clientId: client.id,
              logId: logEntry.id,
              url,
            },
          }
        );
        sent++;
      } catch (error: any) {
        failed++;
        await prisma.notificationLog.update({
          where: { id: logEntry.id },
          data: {
            status: "failed",
            errorMessage: formatPushError(error),
          },
        });

        if (isInvalidSubscription(error)) {
          await prisma.pushSubscription
            .delete({ where: { id: subscription.id } })
            .catch(() => undefined);
        }
      }
    }
  }

  return {
    ok: sent > 0,
    sent,
    failed,
    skipped,
    clients: clients.length,
    reason: sent > 0 ? undefined : "no-recipients",
  };
}

export async function sendDailyWaterReminderToAllDietUpdateClients() {
  const dietitians = await prisma.user.findMany({
    where: {
      role: "dietitian",
      isApproved: true,
      clients: {
        some: {
          user: {
            pushSubscriptions: { some: {} },
          },
        },
      },
    },
    select: { id: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const dietitian of dietitians) {
    const result = await sendClientNotifications({
      dietitianId: dietitian.id,
      body: DAILY_WATER_MESSAGE,
      type: "daily_water_reminder",
      url: "/client",
      respectDietUpdatesPreference: true,
    });
    sent += result.sent;
    failed += result.failed;
    skipped += result.skipped;
  }

  return { sent, failed, skipped, dietitians: dietitians.length };
}
