import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";

export interface MealReminder {
  userId: number;
  clientId: number;
  clientName: string;
  clientSurname: string;
  dietId: number;
  dietDate: Date;
  ogunId: number;
  ogunName: string;
  ogunTime: string;
  ogunDetail: string | null;
  menuItems: Array<{
    miktar: string | null;
    birim: string | null;
    besinName: string;
  }>;
}

/**
 * Format Turkish date (e.g., "15 Ocak 2024")
 */
export function formatTurkishDate(date: Date | string | null): string {
  if (!date) return "Tarih Belirtilmemiş";
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "d MMMM yyyy", { locale: tr });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Geçersiz Tarih";
  }
}

/**
 * Format menu items as "miktar birim besin" (e.g., "2 adet Yumurta, 2 dilim Ekmek")
 */
export function formatMenuItems(
  items: Array<{ miktar: string | null; birim: string | null; besinName: string }>
): string {
  if (!items || items.length === 0) {
    return "Menü belirtilmemiş";
  }

  return items
    .map((item) => {
      const parts: string[] = [];
      if (item.miktar) parts.push(item.miktar);
      if (item.birim) parts.push(item.birim);
      if (item.besinName) parts.push(item.besinName);

      return parts.join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * Format meal notification message
 */
export function formatMealNotificationMessage(reminder: MealReminder): string {
  const dietDateStr = formatTurkishDate(reminder.dietDate);
  const menuItemsStr = formatMenuItems(reminder.menuItems);

  let message = `Sayın ${reminder.clientName} ${reminder.clientSurname}, ${dietDateStr} tarihinde yazılan diyetinize ilişkin ${reminder.ogunName} menünüz: ${menuItemsStr}`;

  if (reminder.ogunDetail) {
    message += `. ${reminder.ogunDetail}`;
  }

  return message;
}

/**
 * Parse time string (e.g., "08:00") to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return -1;
    }
    return hours * 60 + minutes;
  } catch {
    return -1;
  }
}

/**
 * Get current time in Turkey (GMT+3) timezone
 * Returns an object with hours and minutes in Turkey time
 */
function getTurkeyTime(): { hours: number; minutes: number; totalMinutes: number } {
  const now = new Date();
  // Turkey is GMT+3 (UTC+3)
  // Get UTC hours and add 3
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  
  // Convert to Turkey time (UTC+3)
  const turkeyTotalMinutes = utcHours * 60 + utcMinutes + 3 * 60;
  const turkeyHours = Math.floor(turkeyTotalMinutes / 60) % 24;
  const turkeyMinutes = turkeyTotalMinutes % 60;
  
  return {
    hours: turkeyHours,
    minutes: turkeyMinutes,
    totalMinutes: turkeyTotalMinutes % (24 * 60), // Keep within 24 hours
  };
}

/**
 * Check if a meal reminder should be sent
 * Returns true if current time (GMT+3) is within 15 minutes window of (meal time - 30 minutes)
 * 
 * Example:
 * - Meal time: 08:00 (Turkey time)
 * - Reminder time: 07:30 (30 minutes before)
 * - Window: 07:30 - 07:45 (15 minutes)
 * - If current time is 07:35 (Turkey time), return true
 */
export function shouldSendReminder(
  mealTime: string,
  currentTime?: Date
): boolean {
  const mealMinutes = parseTimeToMinutes(mealTime);
  if (mealMinutes < 0) {
    return false;
  }

  // Get Turkey time (GMT+3)
  let turkeyTime: { hours: number; minutes: number; totalMinutes: number };
  if (currentTime) {
    // If custom time provided, convert it to Turkey time
    const utcHours = currentTime.getUTCHours();
    const utcMinutes = currentTime.getUTCMinutes();
    const turkeyTotalMinutes = utcHours * 60 + utcMinutes + 3 * 60;
    const turkeyHours = Math.floor(turkeyTotalMinutes / 60) % 24;
    const turkeyMinutes = turkeyTotalMinutes % 60;
    turkeyTime = {
      hours: turkeyHours,
      minutes: turkeyMinutes,
      totalMinutes: turkeyTotalMinutes % (24 * 60),
    };
  } else {
    turkeyTime = getTurkeyTime();
  }
  
  // Reminder should be sent 30 minutes before meal time
  let reminderMinutes = mealMinutes - 30;
  
  // Handle day wrap-around (e.g., meal at 00:30, reminder at 23:60 = 00:00 previous day)
  if (reminderMinutes < 0) {
    reminderMinutes = reminderMinutes + 24 * 60;
  }

  const currentTotalMinutes = turkeyTime.totalMinutes;

  // Check if we're in the 15-minute window starting at reminder time
  const windowStart = reminderMinutes;
  const windowEnd = reminderMinutes + 15;

  // Handle day wrap-around for window
  if (windowEnd > 24 * 60) {
    // Window spans midnight (e.g., 23:45 - 00:00)
    const windowEndAdjusted = windowEnd - 24 * 60;
    return (
      currentTotalMinutes >= windowStart || currentTotalMinutes < windowEndAdjusted
    );
  }

  // Normal case: window is within the same day
  return currentTotalMinutes >= windowStart && currentTotalMinutes < windowEnd;
}

/**
 * Get clients eligible for meal reminders
 * - Clients with diets within last 14 days (based on Diet.tarih)
 * - Users with mealReminders preference enabled (or no preference, default true)
 * - Users with active push subscriptions
 */
export async function getClientsEligibleForReminders(): Promise<
  Array<{
    userId: number;
    clientId: number;
    clientName: string;
    clientSurname: string;
    dietId: number;
    dietDate: Date;
    pushSubscriptions: Array<{
      endpoint: string;
      auth: string;
      p256dh: string;
    }>;
    oguns: Array<{
      id: number;
      name: string;
      time: string;
      detail: string | null;
      items: Array<{
        miktar: string | null;
        besin: { name: string };
        birim: { name: string } | null;
      }>;
    }>;
  }>
> {
  // Calculate 14 days ago in Turkey time (GMT+3)
  // Diets are stored in UTC, but we filter based on Turkey time
  // Strategy: Get current Turkey time, subtract 14 days, then convert to UTC for DB query
  const now = new Date();
  
  // Get Turkey time components (UTC + 3 hours)
  const utcTime = now.getTime();
  const turkeyTimeMs = utcTime + 3 * 60 * 60 * 1000;
  const turkeyDate = new Date(turkeyTimeMs);
  
  // Create a date 14 days ago in Turkey time at 00:00:00
  const fourteenDaysAgoTurkey = new Date(turkeyDate);
  fourteenDaysAgoTurkey.setUTCDate(fourteenDaysAgoTurkey.getUTCDate() - 14);
  fourteenDaysAgoTurkey.setUTCHours(0, 0, 0, 0);
  fourteenDaysAgoTurkey.setUTCMinutes(0);
  fourteenDaysAgoTurkey.setUTCSeconds(0);
  fourteenDaysAgoTurkey.setUTCMilliseconds(0);
  
  // Convert back to UTC: Turkey 00:00 = UTC 21:00 previous day
  // Subtract 3 hours to get the UTC time
  const fourteenDaysAgo = new Date(fourteenDaysAgoTurkey.getTime() - 3 * 60 * 60 * 1000);

  // Get clients with diets within last 14 days
  const clientsWithDiets = await prisma.client.findMany({
    where: {
      userId: { not: null },
      diets: {
        some: {
          tarih: {
            gte: fourteenDaysAgo,
            not: null,
          },
        },
      },
    },
    include: {
      user: {
        include: {
          notificationPreference: true,
          pushSubscriptions: true,
        },
      },
      diets: {
        where: {
          tarih: {
            gte: fourteenDaysAgo,
            not: null,
          },
        },
        orderBy: {
          tarih: "desc",
        },
        take: 1, // Get latest diet
        include: {
          oguns: {
            include: {
              items: {
                include: {
                  besin: true,
                  birim: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const eligibleClients: Array<{
    userId: number;
    clientId: number;
    clientName: string;
    clientSurname: string;
    dietId: number;
    dietDate: Date;
    pushSubscriptions: Array<{
      endpoint: string;
      auth: string;
      p256dh: string;
    }>;
    oguns: Array<{
      id: number;
      name: string;
      time: string;
      detail: string | null;
      items: Array<{
        miktar: string | null;
        besin: { name: string };
        birim: { name: string } | null;
      }>;
    }>;
  }> = [];

  for (const client of clientsWithDiets) {
    if (!client.userId || !client.user) {
      continue;
    }

    // Check notification preference (default to true if not set)
    const preference = client.user.notificationPreference;
    if (preference && !preference.mealReminders) {
      continue;
    }

    // Check if user has push subscriptions
    if (!client.user.pushSubscriptions || client.user.pushSubscriptions.length === 0) {
      continue;
    }

    // Get latest diet
    const latestDiet = client.diets[0];
    if (!latestDiet || !latestDiet.tarih) {
      continue;
    }

    eligibleClients.push({
      userId: client.userId,
      clientId: client.id,
      clientName: client.name,
      clientSurname: client.surname,
      dietId: latestDiet.id,
      dietDate: latestDiet.tarih,
      pushSubscriptions: client.user.pushSubscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        auth: sub.auth,
        p256dh: sub.p256dh,
      })),
      oguns: latestDiet.oguns.map((ogun) => ({
        id: ogun.id,
        name: ogun.name,
        time: ogun.time,
        detail: ogun.detail,
        items: ogun.items.map((item) => ({
          miktar: item.miktar,
          besin: { name: item.besin.name },
          birim: item.birim ? { name: item.birim.name } : null,
        })),
      })),
    });
  }

  return eligibleClients;
}

/**
 * Get meals that need reminders in the current time window
 */
export async function getMealsForReminderWindow(): Promise<MealReminder[]> {
  const eligibleClients = await getClientsEligibleForReminders();
  const reminders: MealReminder[] = [];
  // Use current UTC time for reminder checks (will be converted to Turkey time in shouldSendReminder)
  const now = new Date();

  for (const client of eligibleClients) {
    // Use oguns from client data if available, otherwise skip (should not happen)
    if (!client.oguns || client.oguns.length === 0) {
      continue;
    }

    for (const ogun of client.oguns) {
      if (!ogun.time) {
        continue;
      }

      // Check if reminder should be sent (uses Turkey time GMT+3 internally)
      if (shouldSendReminder(ogun.time)) {
        const menuItems = ogun.items.map((item) => ({
          miktar: item.miktar,
          birim: item.birim?.name || null,
          besinName: item.besin.name,
        }));

        reminders.push({
          userId: client.userId,
          clientId: client.clientId,
          clientName: client.clientName,
          clientSurname: client.clientSurname,
          dietId: client.dietId,
          dietDate: client.dietDate,
          ogunId: ogun.id,
          ogunName: ogun.name,
          ogunTime: ogun.time,
          ogunDetail: ogun.detail,
          menuItems,
        });
      }
    }
  }

  return reminders;
}

/**
 * Send meal reminders for all eligible clients
 */
export async function sendMealReminders(): Promise<{
  sent: number;
  failed: number;
  reminders: MealReminder[];
}> {
  // Get reminders (this includes client data with push subscriptions)
  const reminders = await getMealsForReminderWindow();
  let sent = 0;
  let failed = 0;

  // Get eligible clients to access push subscriptions
  const eligibleClients = await getClientsEligibleForReminders();
  const clientMap = new Map(
    eligibleClients.map((c) => [
      c.userId,
      {
        userId: c.userId,
        pushSubscriptions: c.pushSubscriptions,
      },
    ])
  );

  // Group reminders by user
  const remindersByUser = new Map<
    number,
    {
      userId: number;
      pushSubscriptions: Array<{ endpoint: string; auth: string; p256dh: string }>;
      reminders: MealReminder[];
    }
  >();

  for (const reminder of reminders) {
    const clientData = clientMap.get(reminder.userId);
    if (!clientData || !clientData.pushSubscriptions || clientData.pushSubscriptions.length === 0) {
      continue;
    }

    if (!remindersByUser.has(reminder.userId)) {
      remindersByUser.set(reminder.userId, {
        userId: reminder.userId,
        pushSubscriptions: clientData.pushSubscriptions,
        reminders: [],
      });
    }

    remindersByUser.get(reminder.userId)!.reminders.push(reminder);
  }

  // Send notifications
  const { sendWebPushNotification, isWebPushConfigured } = await import("@/lib/web-push");

  if (!isWebPushConfigured()) {
    console.warn("⚠️ Web push is not configured, skipping meal reminders");
    return { sent: 0, failed: reminders.length, reminders };
  }

  for (const [userId, userData] of remindersByUser.entries()) {
    // For now, send one notification per meal (can be optimized to send grouped notification)
    for (const reminder of userData.reminders) {
      const message = formatMealNotificationMessage(reminder);
      const title = `${reminder.ogunName} zamanı yaklaşıyor!`;

      for (const subscription of userData.pushSubscriptions) {
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
              title,
              body: message,
              url: `/client/diets/${reminder.dietId}`,
              data: {
                type: "meal_reminder",
                dietId: reminder.dietId,
                ogunId: reminder.ogunId,
              },
            }
          );
          sent++;
          console.log(
            `✅ Sent meal reminder to user ${userId} for meal ${reminder.ogunName}`
          );
        } catch (error: any) {
          console.error(
            `❌ Failed to send reminder to user ${userId} for meal ${reminder.ogunName}:`,
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
              console.error("Failed to delete invalid subscription:", deleteError);
            }
          }
        }
      }
    }
  }

  return { sent, failed, reminders };
}

