import prisma from "@/lib/prisma";
import {
  formatMealNotificationMessage,
  formatShortMealNotificationMessage,
  getActiveReminderKind,
  MealReminder,
} from "@/services/MealReminderService";
import { sendWebPushNotification, isWebPushConfigured } from "@/lib/web-push";
import { route } from "@/lib/api/handler";

/**
 * GET /api/notifications/check-meal-reminders
 * Checks and dispatches pending meal-reminder push notifications for the signed-in user.
 * Called client-side when the user opens the app or visits the dashboard.
 */
export const GET = route({
  cors: true,
  auth: "any",
  scope: "notifications.check-meal-reminders",
  handler: async ({ auth, log }) => {
    const userId = auth.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: {
          include: {
            diets: {
              where: {
                tarih: {
                  gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                  not: null,
                },
              },
              orderBy: { tarih: "desc" },
              take: 1,
              include: {
                oguns: {
                  include: {
                    items: {
                      include: { besin: true, birim: true },
                    },
                  },
                },
              },
            },
          },
        },
        notificationPreference: true,
        pushSubscriptions: true,
      },
    });

    if (!user || !user.client) {
      return { success: true, reminders: [], message: "No client found for user" };
    }

    const preference = user.notificationPreference;
    if (preference && !preference.mealReminders) {
      return {
        success: true,
        reminders: [],
        message: "Meal reminders disabled by user",
      };
    }

    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return {
        success: true,
        reminders: [],
        message: "No push subscriptions found",
      };
    }

    const latestDiet = user.client.diets[0];
    if (!latestDiet || !latestDiet.tarih || !latestDiet.oguns) {
      return {
        success: true,
        reminders: [],
        message: "No active diet found",
      };
    }

    const now = new Date();
    const pendingReminders: Array<{
      ogunId: number;
      ogunName: string;
      ogunTime: string;
      message: string;
      shortMessage: string;
      reminder: MealReminder;
    }> = [];

    for (const ogun of latestDiet.oguns) {
      if (!ogun.time) continue;
      const kind = getActiveReminderKind(ogun.time, now);
      if (!kind) continue;

      const menuItems = ogun.items.map((item) => ({
        miktar: item.miktar,
        birim: item.birim?.name || null,
        besinName: item.besin.name,
      }));

      const reminder: MealReminder = {
        userId: user.id,
        clientId: user.client.id,
        clientName: user.client.name,
        clientSurname: user.client.surname,
        dietId: latestDiet.id,
        dietDate: latestDiet.tarih,
        ogunId: ogun.id,
        ogunName: ogun.name,
        ogunTime: ogun.time,
        ogunDetail: ogun.detail,
        kind,
        menuItems,
      };

      pendingReminders.push({
        ogunId: ogun.id,
        ogunName: ogun.name,
        ogunTime: ogun.time,
        message: formatMealNotificationMessage(reminder),
        shortMessage: formatShortMealNotificationMessage(reminder),
        reminder,
      });
    }

    if (!isWebPushConfigured()) {
      return {
        success: true,
        reminders: pendingReminders,
        sent: 0,
        failed: 0,
        message: "Web push is not configured",
      };
    }

    let sent = 0;
    let failed = 0;

    for (const reminderData of pendingReminders) {
      const kind = reminderData.reminder.kind;
      const title =
        kind === "T-0"
          ? `${reminderData.ogunName} vakti!`
          : `${reminderData.ogunName}: 30 dk kaldı`;
      const logType = kind === "T-0" ? "meal_time" : "meal_reminder";
      const notificationTag = `${logType}-${reminderData.ogunId}`;

      for (const subscription of user.pushSubscriptions) {
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
              body: reminderData.shortMessage,
              url: `/client/diets/${latestDiet.id}?ogunId=${reminderData.ogunId}`,
              tag: notificationTag,
              requireInteraction: false,
              data: {
                type: logType,
                dietId: latestDiet.id,
                ogunId: reminderData.ogunId,
              },
            },
          );
          sent++;
        } catch (error) {
          log.warn("reminder push failed", {
            endpoint: subscription.endpoint,
            ogun: reminderData.ogunName,
          });
          failed++;
          const status = (error as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await prisma.pushSubscription
              .delete({ where: { endpoint: subscription.endpoint } })
              .catch(() => undefined);
          }
        }
      }
    }

    return {
      success: true,
      reminders: pendingReminders,
      sent,
      failed,
      message: `Found ${pendingReminders.length} pending reminders, sent ${sent} notifications`,
    };
  },
});
