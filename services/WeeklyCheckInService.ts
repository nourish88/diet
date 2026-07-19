import prisma from "@/lib/prisma";
import { PUBLIC_DIETITIAN_NAME } from "@/lib/brand-identity";
import {
  getWeeklyCheckInWeekStart,
  type WeeklyCheckInMode,
} from "@/lib/weekly-check-in";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";

const INITIAL_TITLE = "Haftalık kontrol zamanı 🌿";
const INITIAL_MESSAGE =
  "Geçen haftanın nasıl geçtiğini birkaç kısa soruyla paylaşır mısınız?";
const REMINDER_TITLE = "Haftalık kontrolünüz sizi bekliyor";
const REMINDER_MESSAGE =
  "Formu henüz doldurmadıysanız bugün birkaç dakikanızı ayırabilirsiniz.";
const TRANSACTION_MAX_WAIT_MS = 10_000;
const TRANSACTION_TIMEOUT_MS = 30_000;

type DeliveryClient = {
  id: number;
  name: string;
  surname: string;
  dietitianId: number;
  dietitian: { name: string | null; email: string };
  user: {
    notificationPreference: { dietUpdates: boolean } | null;
    pushSubscriptions: Array<{
      id: number;
      endpoint: string;
      auth: string;
      p256dh: string;
    }>;
  } | null;
};

function fullName(client: Pick<DeliveryClient, "name" | "surname">) {
  return `${client.name} ${client.surname}`.trim();
}

function invalidSubscription(error: unknown) {
  const status = (error as { statusCode?: number })?.statusCode;
  return status === 404 || status === 410;
}

function pushError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
}

async function deliver(
  recipient: {
    id: number;
    clientId: number | null;
    actionUrl: string | null;
  },
  client: DeliveryClient,
  title: string,
  body: string,
) {
  const subscriptions = client.user?.pushSubscriptions ?? [];
  if (
    !isWebPushConfigured() ||
    !subscriptions.length ||
    client.user?.notificationPreference?.dietUpdates === false
  ) {
    return { sent: 0, failed: 0, skipped: 1 };
  }

  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;
  for (const subscription of subscriptions) {
    try {
      await sendWebPushNotification(
        {
          endpoint: subscription.endpoint,
          keys: { auth: subscription.auth, p256dh: subscription.p256dh },
        },
        {
          title,
          body,
          url: recipient.actionUrl ?? "/client",
          tag: `weekly-check-in-${recipient.id}`,
          requireInteraction: true,
          data: {
            type: "weekly_check_in",
            broadcastRecipientId: recipient.id,
            url: recipient.actionUrl ?? "/client",
          },
        },
      );
      sent++;
    } catch (error) {
      failed++;
      lastError = pushError(error);
      if (invalidSubscription(error)) {
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
      deliveryStatus: sent
        ? failed
          ? "partial"
          : "sent"
        : "failed",
      errorMessage: lastError,
    },
  });

  return { sent, failed, skipped: 0 };
}

export async function sendWeeklyCheckIns(
  mode: WeeklyCheckInMode,
  now = new Date(),
) {
  const weekStart = getWeeklyCheckInWeekStart(now, mode);
  const clients = (await prisma.client.findMany({
    where: {
      isActive: true,
      userId: { not: null },
      dietitianId: { not: null },
    },
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
  })) as DeliveryClient[];

  const grouped = new Map<number, DeliveryClient[]>();
  for (const client of clients) {
    const group = grouped.get(client.dietitianId) ?? [];
    group.push(client);
    grouped.set(client.dietitianId, group);
  }

  const title = mode === "initial" ? INITIAL_TITLE : REMINDER_TITLE;
  const message = mode === "initial" ? INITIAL_MESSAGE : REMINDER_MESSAGE;
  let persisted = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const [dietitianId, dietitianClients] of grouped) {
    const clientIds = dietitianClients.map((client) => client.id);

    if (mode === "initial") {
      // A single bulk insert avoids one database round-trip per client. Existing
      // rows are intentionally retained so a previously interrupted cron run
      // can safely resume and finish creating its notification broadcast.
      await prisma.weeklyCheckIn.createMany({
        data: dietitianClients.map((client) => ({
          clientId: client.id,
          dietitianId,
          weekStart,
          isTest: false,
        })),
        skipDuplicates: true,
      });
    }

    const checkIns = await prisma.weeklyCheckIn.findMany({
      where: {
        clientId: { in: clientIds },
        weekStart,
        isTest: false,
      },
    });
    const checkInByClientId = new Map(
      checkIns.map((checkIn) => [checkIn.clientId, checkIn]),
    );
    const candidates = dietitianClients.map((client) => ({
      client,
      checkIn: checkInByClientId.get(client.id) ?? null,
    }));

    const eligible = candidates.filter(
      (candidate): candidate is typeof candidate & { checkIn: NonNullable<typeof candidate.checkIn> } => {
        const checkIn = candidate.checkIn;
        if (!checkIn) return false;
        return mode === "initial"
          ? !checkIn.sentAt
          : checkIn.status === "pending" &&
              Boolean(checkIn.sentAt) &&
              !checkIn.reminderSentAt;
      },
    );
    if (!eligible.length) continue;

    const dedupeKey = `weekly-check-in:${dietitianId}:${weekStart
      .toISOString()
      .slice(0, 10)}:${mode}`;
    const existing = await prisma.broadcastMessage.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    if (existing) {
      skipped += eligible.length;
      continue;
    }

    const broadcast = await prisma.$transaction(
      async (tx) => {
        const created = await tx.broadcastMessage.create({
          data: {
            dietitianId,
            dietitianName: PUBLIC_DIETITIAN_NAME,
            title,
            message,
            type: "weekly_check_in",
            dedupeKey,
            recipients: {
              create: eligible.map(({ client, checkIn }) => ({
                clientId: client.id,
                clientName: fullName(client),
                weeklyCheckInId: checkIn.id,
                actionUrl: `/client/check-in/${checkIn.id}`,
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

        await tx.weeklyCheckIn.updateMany({
          where: { id: { in: eligible.map(({ checkIn }) => checkIn.id) } },
          data:
            mode === "initial"
              ? { sentAt: now }
              : { reminderSentAt: now },
        });
        return created;
      },
      {
        maxWait: TRANSACTION_MAX_WAIT_MS,
        timeout: TRANSACTION_TIMEOUT_MS,
      },
    );

    persisted += broadcast.recipients.length;
    const eligibleClientById = new Map(
      eligible.map(({ client }) => [client.id, client]),
    );
    for (const recipient of broadcast.recipients) {
      const client = recipient.clientId
        ? eligibleClientById.get(recipient.clientId)
        : undefined;
      if (!client) continue;
      const result = await deliver(recipient, client, title, message);
      sent += result.sent;
      failed += result.failed;
      skipped += result.skipped;
    }
  }

  return {
    mode,
    weekStart: weekStart.toISOString(),
    activeClients: clients.length,
    persisted,
    sent,
    failed,
    skipped,
  };
}
