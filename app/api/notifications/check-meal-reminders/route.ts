import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import prisma from "@/lib/prisma";
import {
  formatMealNotificationMessage,
  MealReminder,
  shouldSendReminder,
} from "@/services/MealReminderService";
import { sendWebPushNotification, isWebPushConfigured } from "@/lib/web-push";

/**
 * Check for pending meal reminders for authenticated user
 * This endpoint is called from client-side when user opens app or visits dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = auth.user.id;

    // Get user's client info
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
              orderBy: {
                tarih: "desc",
              },
              take: 1,
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
        },
        notificationPreference: true,
        pushSubscriptions: true,
      },
    });

    if (!user || !user.client) {
      return addCorsHeaders(
        NextResponse.json({
          success: true,
          reminders: [],
          message: "No client found for user",
        })
      );
    }

    // Check notification preference
    const preference = user.notificationPreference;
    if (preference && !preference.mealReminders) {
      return addCorsHeaders(
        NextResponse.json({
          success: true,
          reminders: [],
          message: "Meal reminders disabled by user",
        })
      );
    }

    // Check if user has push subscriptions
    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return addCorsHeaders(
        NextResponse.json({
          success: true,
          reminders: [],
          message: "No push subscriptions found",
        })
      );
    }

    const latestDiet = user.client.diets[0];
    if (!latestDiet || !latestDiet.tarih || !latestDiet.oguns) {
      return addCorsHeaders(
        NextResponse.json({
          success: true,
          reminders: [],
          message: "No active diet found",
        })
      );
    }

    // Find meals that need reminders
    const now = new Date();
    const pendingReminders: Array<{
      ogunId: number;
      ogunName: string;
      ogunTime: string;
      message: string;
    }> = [];

    for (const ogun of latestDiet.oguns) {
      if (!ogun.time) {
        continue;
      }

      // Check if reminder should be sent (within next 15 minutes window)
      if (shouldSendReminder(ogun.time, now)) {
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
          menuItems,
        };

        const message = formatMealNotificationMessage(reminder);
        pendingReminders.push({
          ogunId: ogun.id,
          ogunName: ogun.name,
          ogunTime: ogun.time,
          message,
        });
      }
    }

    // Send push notifications for pending reminders
    let sent = 0;
    let failed = 0;

    if (!isWebPushConfigured()) {
      return addCorsHeaders(
        NextResponse.json({
          success: true,
          reminders: pendingReminders,
          sent: 0,
          failed: 0,
          message: "Web push is not configured",
        })
      );
    }

    for (const reminder of pendingReminders) {
      const title = `${reminder.ogunName} zamanı yaklaşıyor!`;

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
              body: reminder.message,
              url: `/client/diets/${latestDiet.id}`,
              data: {
                type: "meal_reminder",
                dietId: latestDiet.id,
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
            `❌ Failed to send reminder for meal ${reminder.ogunName}:`,
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

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        reminders: pendingReminders,
        sent,
        failed,
        message: `Found ${pendingReminders.length} pending reminders, sent ${sent} notifications`,
      })
    );
  } catch (error: any) {
    console.error("❌ Check meal reminders error:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to check meal reminders" },
        { status: 500 }
      )
    );
  }
}

