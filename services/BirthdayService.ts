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
  clientCount: number;
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
 * Get clients with birthdays today (GMT+3)
 * @param dietitianId Optional: filter by dietitian ID
 */
export async function getClientsWithBirthdaysToday(
  dietitianId?: number
): Promise<BirthdayClient[]> {
  const turkeyTime = getTurkeyTime();
  const todayMonth = turkeyTime.getMonth() + 1; // JavaScript months are 0-indexed
  const todayDay = turkeyTime.getDate();

  const whereClause: any = {
    birthdate: {
      not: null,
    },
  };

  if (dietitianId) {
    whereClause.dietitianId = dietitianId;
  }

  // Get all clients with birthdates
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

  // Filter clients whose birthday is today
  const birthdayClients: BirthdayClient[] = clients.filter((client) => {
    if (!client.birthdate) return false;

    const birthdate = new Date(client.birthdate);
    const birthMonth = birthdate.getMonth() + 1;
    const birthDay = birthdate.getDate();

    return birthMonth === todayMonth && birthDay === todayDay;
  });

  return birthdayClients;
}

/**
 * Format birthday WhatsApp message
 * @param clientName Client's first name
 */
export function formatBirthdayMessage(clientName: string): string {
  return `Merhaba ${clientName}, doğum gününüz kutlu olsun! Ezgi Evgin Aktaş diyet ve beslenme danışmanlığı olarak fit ve sağlıklı bir yıl dileriz. 🎂🎉`;
}

/**
 * Generate WhatsApp deep link URL
 * @param phoneNumber Phone number in international format (e.g., 905551234567)
 * @param message Pre-filled message
 */
export function generateWhatsAppURL(
  phoneNumber: string,
  message: string
): string {
  // Remove any non-digit characters and ensure it starts with country code
  const cleanedPhone = phoneNumber.replace(/\D/g, "");
  
  // If phone doesn't start with country code, assume Turkey (90)
  const formattedPhone = cleanedPhone.startsWith("90")
    ? cleanedPhone
    : `90${cleanedPhone}`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Get dietitians who have clients with birthdays today
 */
export async function getDietitiansWithBirthdayClients(): Promise<
  DietitianWithBirthdays[]
> {
  // Get all clients with birthdays today
  const birthdayClients = await getClientsWithBirthdaysToday();

  if (birthdayClients.length === 0) {
    return [];
  }

  // Group clients by dietitian
  const clientsByDietitian = new Map<number, BirthdayClient[]>();
  
  for (const client of birthdayClients) {
    if (!client.dietitianId) continue;
    
    if (!clientsByDietitian.has(client.dietitianId)) {
      clientsByDietitian.set(client.dietitianId, []);
    }
    
    clientsByDietitian.get(client.dietitianId)!.push(client);
  }

  // Get dietitians with their push subscriptions
  const dietitianIds = Array.from(clientsByDietitian.keys());
  const dietitians = await prisma.user.findMany({
    where: {
      id: { in: dietitianIds },
      role: "dietitian",
    },
    select: {
      id: true,
      pushSubscriptions: {
        where: {
          // Only active subscriptions (you might want to add expiration checks)
        },
        select: {
          endpoint: true,
          auth: true,
          p256dh: true,
        },
      },
    },
  });

  // Build result array
  const result: DietitianWithBirthdays[] = [];

  for (const dietitian of dietitians) {
    if (dietitian.pushSubscriptions.length === 0) continue;

    const clientCount = clientsByDietitian.get(dietitian.id)?.length || 0;
    if (clientCount === 0) continue;

    result.push({
      dietitianId: dietitian.id,
      userId: dietitian.id,
      clientCount,
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
 * Send birthday notifications to dietitians
 */
export async function sendBirthdayNotifications(): Promise<{
  sent: number;
  failed: number;
  dietitiansNotified: number;
}> {
  const dietitians = await getDietitiansWithBirthdayClients();

  if (dietitians.length === 0) {
    console.log("📅 No dietitians with birthday clients today");
    return { sent: 0, failed: 0, dietitiansNotified: 0 };
  }

  const { sendWebPushNotification, isWebPushConfigured } = await import(
    "@/lib/web-push"
  );

  if (!isWebPushConfigured()) {
    console.warn("⚠️ Web push is not configured, skipping birthday notifications");
    return { sent: 0, failed: dietitians.length, dietitiansNotified: 0 };
  }

  let sent = 0;
  let failed = 0;
  let dietitiansNotified = 0;

  for (const dietitian of dietitians) {
    try {
      const notificationTitle = "Doğum Günü Hatırlatıcısı";
      const notificationBody = `${dietitian.clientCount} adet danışanınızın bugün doğum günü kutlamak için tıklayınız`;
      const notificationTag = `birthday-reminder-${dietitian.dietitianId}`;

      // Send notification to all push subscriptions
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
              url: "/birthdays",
              tag: notificationTag,
              requireInteraction: false,
              data: {
                type: "birthday_reminder",
                count: dietitian.clientCount,
                url: "/birthdays",
              },
            }
          );
          sent++;
        } catch (error: any) {
          console.error(
            `❌ Failed to send birthday notification to dietitian ${dietitian.dietitianId}:`,
            error
          );
          failed++;

          // Delete invalid/expired subscriptions
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            try {
              await prisma.pushSubscription.delete({
                where: { endpoint: subscription.endpoint },
              });
              console.log(
                `🗑️ Deleted invalid subscription: ${subscription.endpoint}`
              );
            } catch (deleteError) {
              console.error("Error deleting subscription:", deleteError);
            }
          }
        }
      }

      dietitiansNotified++;
      console.log(
        `✅ Sent birthday notification to dietitian ${dietitian.dietitianId} (${dietitian.clientCount} clients)`
      );
    } catch (error: any) {
      console.error(
        `❌ Error processing dietitian ${dietitian.dietitianId}:`,
        error
      );
      failed++;
    }
  }

  return { sent, failed, dietitiansNotified };
}

