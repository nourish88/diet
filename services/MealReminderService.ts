import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { sendWebPushNotification, isWebPushConfigured } from "@/lib/web-push";

/**
 * web-push throws errors whose `.message` is often the unhelpful
 * "Received unexpected response code". The real signal is on `.statusCode` and
 * `.body`. Combine them so the dietitian's log column shows what FCM actually
 * said (401 = VAPID mismatch, 410 = subscription gone, 413 = payload too big,
 * etc.) instead of a generic string.
 */
function formatPushError(error: any): string {
  const status = error?.statusCode;
  const body =
    typeof error?.body === "string"
      ? error.body.trim().slice(0, 200)
      : undefined;
  const message = error?.message || String(error);
  if (status && body) return `[${status}] ${message} — ${body}`;
  if (status) return `[${status}] ${message}`;
  return message;
}

export type MealReminderKind = "T-30" | "T-0";

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
  kind: MealReminderKind;
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
  items: Array<{ miktar: string | null; birim: string | null; besinName: string }>,
  maxItems?: number
): string {
  if (!items || items.length === 0) {
    return "Menü belirtilmemiş";
  }

  const itemsToShow = maxItems ? items.slice(0, maxItems) : items;
  const formatted = itemsToShow
    .map((item) => {
      const parts: string[] = [];
      if (item.miktar) parts.push(item.miktar);
      if (item.birim) parts.push(item.birim);
      if (item.besinName) parts.push(item.besinName);

      return parts.join(" ");
    })
    .filter(Boolean)
    .join(", ");

  if (maxItems && items.length > maxItems) {
    return `${formatted}...`;
  }

  return formatted;
}

/**
 * Format meal notification message (full version for in-app display)
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
 * Format short meal notification message for push notifications (max 120 characters)
 */
export function formatShortMealNotificationMessage(reminder: MealReminder): string {
  // Show first 2-3 menu items, then "..."
  const menuItemsStr = formatMenuItems(reminder.menuItems, 3);
  
  // Build short message: "Öğün adı: İlk 2-3 item... Detaylar için tıklayın"
  let message = `${reminder.ogunName}: ${menuItemsStr}`;
  
  // If message is too long, truncate it
  const maxLength = 100; // Leave room for "Detaylar için tıklayın" or "..."
  if (message.length > maxLength) {
    message = message.substring(0, maxLength - 3) + "...";
  }
  
  // Always add hint to click for details if there are more items or detail text
  if (reminder.menuItems.length > 3 || reminder.ogunDetail) {
    // Don't add if it makes message too long
    const detailsHint = " Detaylar için tıklayın";
    if (message.length + detailsHint.length <= 120) {
      message += detailsHint;
    }
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
 * Returns the active reminder window for a given meal time, or null when no
 * window currently applies. Two windows per meal:
 *   - "T-30": [mealTime − 30, mealTime − 15)  → "öğününüze 30 dk kaldı"
 *   - "T-0":  [mealTime,       mealTime + 15) → "öğün vakti"
 * Both windows are 15 dk to match the pg_cron tick cadence (so at most one
 * cron tick falls inside each window — natural duplicate guard).
 */
export function getActiveReminderKind(
  mealTime: string,
  currentTime?: Date
): MealReminderKind | null {
  const mealMinutes = parseTimeToMinutes(mealTime);
  if (mealMinutes < 0) return null;

  let turkeyTime: { totalMinutes: number };
  if (currentTime) {
    const utcHours = currentTime.getUTCHours();
    const utcMinutes = currentTime.getUTCMinutes();
    const turkeyTotalMinutes = utcHours * 60 + utcMinutes + 3 * 60;
    turkeyTime = { totalMinutes: turkeyTotalMinutes % (24 * 60) };
  } else {
    turkeyTime = getTurkeyTime();
  }
  const now = turkeyTime.totalMinutes;
  const DAY = 24 * 60;

  const inWindow = (start: number) => {
    const s = ((start % DAY) + DAY) % DAY;
    const e = (s + 15) % DAY;
    return e > s ? now >= s && now < e : now >= s || now < e;
  };

  if (inWindow(mealMinutes - 30)) return "T-30";
  if (inWindow(mealMinutes)) return "T-0";
  return null;
}

/**
 * @deprecated Use getActiveReminderKind. Kept for backwards compatibility with
 * the client-side check endpoint which still treats reminders as boolean.
 */
export function shouldSendReminder(
  mealTime: string,
  currentTime?: Date
): boolean {
  return getActiveReminderKind(mealTime, currentTime) !== null;
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

      const kind = getActiveReminderKind(ogun.time);
      if (kind) {
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
          kind,
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
      // Use short message for notification body
      const shortMessage = formatShortMealNotificationMessage(reminder);
      const title =
        reminder.kind === "T-0"
          ? `${reminder.ogunName} vakti!`
          : `${reminder.ogunName}: 30 dk kaldı`;
      const logType =
        reminder.kind === "T-0" ? "meal_time" : "meal_reminder";
      const notificationTag = `${logType}-${reminder.ogunId}`;

      for (const subscription of userData.pushSubscriptions) {
        const logEntry = await prisma.notificationLog.create({
          data: {
            userId,
            clientId: reminder.clientId,
            ogunId: reminder.ogunId,
            type: logType,
            title,
            body: shortMessage,
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
              title,
              body: shortMessage,
              url: `/client/diets/${reminder.dietId}?ogunId=${reminder.ogunId}`,
              tag: notificationTag,
              requireInteraction: false,
              data: {
                type: logType,
                dietId: reminder.dietId,
                ogunId: reminder.ogunId,
                logId: logEntry.id,
              },
            }
          );
          sent++;
          console.log(
            `✅ Sent ${logType} (${reminder.kind}) to user ${userId} for meal ${reminder.ogunName}`
          );
        } catch (error: any) {
          console.error(
            `❌ Failed to send reminder to user ${userId} for meal ${reminder.ogunName}:`,
            error
          );
          await prisma.notificationLog.update({
            where: { id: logEntry.id },
            data: {
              status: "failed",
              errorMessage: formatPushError(error),
            },
          });
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

  // Cleanup old notification logs (> 3 days)
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const deleteResult = await prisma.notificationLog.deleteMany({
      where: {
        sentAt: {
          lt: threeDaysAgo,
        },
      },
    });
    if (deleteResult.count > 0) {
      console.log(`🧹 Cleaned up ${deleteResult.count} old notification logs.`);
    }
  } catch (err) {
    console.error("❌ Failed to clean up notification logs:", err);
  }

  return { sent, failed, reminders };
}

/**
 * Send a meal reminder for a specific ogun, bypassing the time-window check.
 * Used by the dietitian-triggered "Test bildirimi" button so they can verify
 * with the client (in-room) that the push actually arrives.
 *
 * Does NOT touch notification preferences — assumes the dietitian manually
 * triggered this on purpose. Still respects the push subscription requirement:
 * if the client has none, returns `reason: "no-subscriptions"`.
 */
export async function sendMealReminderForOgun(
  ogunId: number
): Promise<{
  ok: boolean;
  sent: number;
  failed: number;
  reason?:
    | "ogun-not-found"
    | "no-user"
    | "no-subscriptions"
    | "push-not-configured";
}> {
  const ogun = await prisma.ogun.findUnique({
    where: { id: ogunId },
    include: {
      items: {
        include: {
          besin: true,
          birim: true,
        },
      },
      diet: {
        include: {
          client: {
            include: {
              user: {
                include: {
                  pushSubscriptions: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ogun || !ogun.diet) {
    return { ok: false, sent: 0, failed: 0, reason: "ogun-not-found" };
  }

  const user = ogun.diet.client.user;
  if (!user) {
    return { ok: false, sent: 0, failed: 0, reason: "no-user" };
  }

  if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
    return { ok: false, sent: 0, failed: 0, reason: "no-subscriptions" };
  }

  if (!isWebPushConfigured()) {
    return { ok: false, sent: 0, failed: 0, reason: "push-not-configured" };
  }

  const reminder: MealReminder = {
    userId: user.id,
    clientId: ogun.diet.client.id,
    clientName: ogun.diet.client.name,
    clientSurname: ogun.diet.client.surname,
    dietId: ogun.diet.id,
    dietDate: ogun.diet.tarih ?? ogun.diet.createdAt,
    ogunId: ogun.id,
    ogunName: ogun.name,
    ogunTime: ogun.time,
    ogunDetail: ogun.detail,
    kind: "T-30",
    menuItems: ogun.items.map((item) => ({
      miktar: item.miktar,
      birim: item.birim?.name ?? null,
      besinName: item.besin.name,
    })),
  };

  const title = `${reminder.ogunName} zamanı yaklaşıyor!`;
  const body = formatShortMealNotificationMessage(reminder);
  // Use a unique tag so manual sends don't overwrite each other in the
  // notification tray when the dietitian taps multiple times for testing.
  const notificationTag = `meal-reminder-${reminder.ogunId}-manual-${Date.now()}`;

  let sent = 0;
  let failed = 0;

  for (const subscription of user.pushSubscriptions) {
    // Create the log row up front so the service worker can ping back with the id.
    const logEntry = await prisma.notificationLog.create({
      data: {
        userId: reminder.userId,
        clientId: reminder.clientId,
        ogunId: reminder.ogunId,
        type: "manual_test",
        title,
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
          title,
          body,
          url: `/client/diets/${reminder.dietId}?ogunId=${reminder.ogunId}`,
          tag: notificationTag,
          requireInteraction: false,
          data: {
            type: "meal_reminder",
            dietId: reminder.dietId,
            ogunId: reminder.ogunId,
            manual: true,
            logId: logEntry.id,
          },
        }
      );
      sent++;
    } catch (error: any) {
      console.error(
        `Failed to send manual meal reminder to ${subscription.endpoint}:`,
        error
      );
      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: {
          status: "failed",
          errorMessage: error?.message || String(error),
        },
      });
      failed++;

      if (error?.statusCode === 404 || error?.statusCode === 410) {
        try {
          await prisma.pushSubscription.delete({
            where: { endpoint: subscription.endpoint },
          });
        } catch (deleteError) {
          console.error("Failed to delete invalid subscription:", deleteError);
        }
      }
    }
  }

  return { ok: sent > 0 || failed === 0, sent, failed };
}

