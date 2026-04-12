import prisma from "@/lib/prisma";

export interface BirthdayClient {
  id: number;
  name: string;
  surname: string;
  phoneNumber: string | null;
  birthdate: Date | null;
  dietitianId: number | null;
}

export interface DietitianWithBirthdays {
  dietitianId: number;
  userId: number;
  clients: BirthdayClient[];
  pushSubscriptions: Array<{
    endpoint: string;
    auth: string;
    p256dh: string;
  }>;
}

/**
 * Get current time in Turkey (GMT+3)
 */
export function getTurkeyTime(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const turkeyTime = new Date(utc + 3 * 3600000); // GMT+3
  return turkeyTime;
}

/**
 * Get today's date at midnight UTC for use as the log date key
 */
export function getTodayDateKey(): Date {
  const turkeyTime = getTurkeyTime();
  return new Date(
    Date.UTC(
      turkeyTime.getFullYear(),
      turkeyTime.getMonth(),
      turkeyTime.getDate()
    )
  );
}

/**
 * Get clients with birthdays today (GMT+3)
 * @param dietitianId Optional: filter by dietitian ID
 */
export async function getClientsWithBirthdaysToday(
  dietitianId?: number
): Promise<BirthdayClient[]> {
  const turkeyTime = getTurkeyTime();
  const todayMonth = turkeyTime.getMonth() + 1;
  const todayDay = turkeyTime.getDate();

  const whereClause: any = {
    birthdate: { not: null },
  };

  if (dietitianId) {
    whereClause.dietitianId = dietitianId;
  }

  const clients = await prisma.client.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      surname: true,
      phoneNumber: true,
      birthdate: true,
      dietitianId: true,
    },
  });

  return clients.filter((client) => {
    if (!client.birthdate) return false;
    const birthdate = new Date(client.birthdate);
    return (
      birthdate.getMonth() + 1 === todayMonth &&
      birthdate.getDate() === todayDay
    );
  });
}

/**
 * Format birthday WhatsApp message
 */
export function formatBirthdayMessage(clientName: string): string {
  return `Merhaba ${clientName}, doğum gününüz kutlu olsun! Ezgi Evgin Aktaş diyet ve beslenme danışmanlığı olarak fit ve sağlıklı bir yıl dileriz. 🎂🎉`;
}

/**
 * Generate WhatsApp deep link URL
 */
export function generateWhatsAppURL(
  phoneNumber: string,
  message: string
): string {
  const cleanedPhone = phoneNumber.replace(/\D/g, "");
  let formattedPhone = cleanedPhone;

  if (formattedPhone.startsWith("0")) {
    formattedPhone = "90" + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith("90")) {
    formattedPhone = "90" + formattedPhone;
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Mark a client as congratulated
 */
export async function markAsCongratulated(
  clientId: number,
  dietitianId: number
): Promise<void> {
  const dateKey = getTodayDateKey();

  await prisma.congratulationLog.upsert({
    where: {
      clientId_dietitianId_date: {
        clientId,
        dietitianId,
        date: dateKey,
      },
    },
    create: {
      clientId,
      dietitianId,
      date: dateKey,
      congratulatedAt: new Date(),
      notificationCount: 1,
      lastNotifiedAt: new Date(),
    },
    update: {
      congratulatedAt: new Date(),
    },
  });
}

/**
 * Get today's CongratulationLog entries for a dietitian
 */
async function getTodayLogs(
  dietitianId: number,
  dateKey: Date
): Promise<
  Map<
    number,
    {
      congratulatedAt: Date | null;
      notificationCount: number;
      lastNotifiedAt: Date | null;
    }
  >
> {
  const logs = await prisma.congratulationLog.findMany({
    where: {
      dietitianId,
      date: dateKey,
    },
    select: {
      clientId: true,
      congratulatedAt: true,
      notificationCount: true,
      lastNotifiedAt: true,
    },
  });

  const map = new Map<
    number,
    {
      congratulatedAt: Date | null;
      notificationCount: number;
      lastNotifiedAt: Date | null;
    }
  >();

  for (const log of logs) {
    map.set(log.clientId, {
      congratulatedAt: log.congratulatedAt,
      notificationCount: log.notificationCount,
      lastNotifiedAt: log.lastNotifiedAt,
    });
  }

  return map;
}

/**
 * Get dietitians with birthday clients today, including their push subscriptions
 */
export async function getDietitiansWithBirthdayClients(): Promise<
  DietitianWithBirthdays[]
> {
  const birthdayClients = await getClientsWithBirthdaysToday();

  if (birthdayClients.length === 0) {
    return [];
  }

  const clientsByDietitian = new Map<number, BirthdayClient[]>();

  for (const client of birthdayClients) {
    if (!client.dietitianId) continue;

    if (!clientsByDietitian.has(client.dietitianId)) {
      clientsByDietitian.set(client.dietitianId, []);
    }

    clientsByDietitian.get(client.dietitianId)!.push(client);
  }

  const dietitianIds = Array.from(clientsByDietitian.keys());
  const dietitians = await prisma.user.findMany({
    where: {
      id: { in: dietitianIds },
      role: "dietitian",
    },
    select: {
      id: true,
      pushSubscriptions: {
        select: {
          endpoint: true,
          auth: true,
          p256dh: true,
        },
      },
    },
  });

  const result: DietitianWithBirthdays[] = [];

  for (const dietitian of dietitians) {
    if (dietitian.pushSubscriptions.length === 0) continue;

    const clients = clientsByDietitian.get(dietitian.id) || [];
    if (clients.length === 0) continue;

    result.push({
      dietitianId: dietitian.id,
      userId: dietitian.id,
      clients,
      pushSubscriptions: dietitian.pushSubscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        auth: sub.auth,
        p256dh: sub.p256dh,
      })),
    });
  }

  return result;
}

/**
 * Send birthday notifications for a specific cron slot.
 *
 * Slot schedule (GMT+3):
 *   slot 0 = 10:00 → send notification for client[0]
 *   slot 1 = 10:30 → retry client[0] if not congratulated + send client[1]
 *   slot 2 = 11:00 → retry client[0,1] if not congratulated + send client[2]
 *   slot 3 = 11:30 → retry client[0,1,2] if not congratulated + send client[3]
 *   ...
 *
 * Each notification names the "main" client and mentions the others.
 */
export async function sendBirthdayNotificationsForSlot(slot: number): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const dietitians = await getDietitiansWithBirthdayClients();
  const dateKey = getTodayDateKey();

  if (dietitians.length === 0) {
    console.log("📅 No dietitians with birthday clients today");
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const { sendWebPushNotification, isWebPushConfigured } = await import(
    "@/lib/web-push"
  );

  if (!isWebPushConfigured()) {
    console.warn("⚠️ Web push not configured, skipping birthday notifications");
    return { sent: 0, failed: 0, skipped: dietitians.length };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const MAX_NOTIFICATIONS_PER_CLIENT = 4; // max retries per client

  for (const dietitian of dietitians) {
    const logs = await getTodayLogs(dietitian.dietitianId, dateKey);
    const clients = dietitian.clients;

    // Determine which clients to notify in this slot:
    // - The "new" client for this slot (index = slot)
    // - All previous clients that haven't been congratulated yet (retries)
    const clientsToNotify: BirthdayClient[] = [];

    for (let i = 0; i <= slot; i++) {
      if (i >= clients.length) break;

      const client = clients[i];
      const log = logs.get(client.id);

      // Skip if already congratulated
      if (log?.congratulatedAt) continue;

      // Skip if exceeded max notification count
      if ((log?.notificationCount ?? 0) >= MAX_NOTIFICATIONS_PER_CLIENT) continue;

      clientsToNotify.push(client);
    }

    if (clientsToNotify.length === 0) {
      skipped++;
      continue;
    }

    // For each client to notify, send a notification mentioning others
    const allClientNames = clients.map((c) => `${c.name} ${c.surname}`);

    for (const mainClient of clientsToNotify) {
      const otherClients = clients.filter((c) => c.id !== mainClient.id);
      const otherNames = otherClients.map((c) => `${c.name} ${c.surname}`);

      const notificationTitle = "🎂 Doğum Günü Hatırlatıcısı";
      const notificationBody =
        otherNames.length > 0
          ? `${mainClient.name} ${mainClient.surname}'nın bugün doğum günü! Kutlamak ister misiniz? Ayrıca: ${otherNames.join(", ")}`
          : `${mainClient.name} ${mainClient.surname}'nın bugün doğum günü! Kutlamak ister misiniz?`;

      const notificationTag = `birthday-${dietitian.dietitianId}-${mainClient.id}`;

      for (const subscription of dietitian.pushSubscriptions) {
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
              title: notificationTitle,
              body: notificationBody,
              url: `/birthdays?clientId=${mainClient.id}`,
              tag: notificationTag,
              requireInteraction: true,
              data: {
                type: "birthday_reminder",
                clientId: mainClient.id,
                phoneNumber: mainClient.phoneNumber,
                otherBirthdays: otherClients.map((c) => ({
                  id: c.id,
                  name: `${c.name} ${c.surname}`,
                  phoneNumber: c.phoneNumber,
                })),
                url: `/birthdays?clientId=${mainClient.id}`,
              },
            }
          );
          sent++;
        } catch (error: any) {
          console.error(
            `❌ Failed to send birthday notification for client ${mainClient.id}:`,
            error
          );
          failed++;

          if (error?.statusCode === 404 || error?.statusCode === 410) {
            try {
              await prisma.pushSubscription.delete({
                where: { endpoint: subscription.endpoint },
              });
            } catch {}
          }
        }
      }

      // Update/create the log for this client
      await prisma.congratulationLog.upsert({
        where: {
          clientId_dietitianId_date: {
            clientId: mainClient.id,
            dietitianId: dietitian.dietitianId,
            date: dateKey,
          },
        },
        create: {
          clientId: mainClient.id,
          dietitianId: dietitian.dietitianId,
          date: dateKey,
          notificationCount: 1,
          lastNotifiedAt: new Date(),
        },
        update: {
          notificationCount: { increment: 1 },
          lastNotifiedAt: new Date(),
        },
      });

      console.log(
        `✅ Sent birthday notification for ${mainClient.name} ${mainClient.surname} (slot ${slot})`
      );
    }
  }

  return { sent, failed, skipped };
}

/**
 * Legacy: send birthday notifications (used for backward compatibility)
 */
export async function sendBirthdayNotifications(): Promise<{
  sent: number;
  failed: number;
  dietitiansNotified: number;
}> {
  const result = await sendBirthdayNotificationsForSlot(0);
  return {
    sent: result.sent,
    failed: result.failed,
    dietitiansNotified: result.sent > 0 ? 1 : 0,
  };
}
