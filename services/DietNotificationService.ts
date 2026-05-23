import prisma from "@/lib/prisma";
import { sendWebPushNotification } from "@/lib/web-push";

export interface NewDietNotification {
  dietId: number;
  clientId: number;
  clientName: string;
  createdAt: Date;
}

/**
 * Get diets created in the last 30 minutes that haven't been notified yet
 */
export async function getNewDietsForNotification(): Promise<NewDietNotification[]> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const now = new Date();

  // Get diets created in the last 30 minutes that haven't been notified yet
  const diets = await prisma.diet.findMany({
    where: {
      createdAt: {
        gte: thirtyMinutesAgo,
        lte: now,
      },
      notifiedAt: null,
      // Only get diets that have a client with a user
      client: {
        userId: {
          not: null,
        },
      },
    },
    include: {
      client: {
        include: {
          user: {
            include: {
              notificationPreference: true,
              pushSubscriptions: true,
            },
          },
        },
      },
    },
  });

  // Filter diets where:
  // 1. Client has a user
  // 2. Client's user has dietUpdates enabled (or no preference, default true)
  // 3. Client's user has push subscriptions
  const eligibleDiets = diets
    .filter((diet) => {
      const user = diet.client.user;
      if (!user) return false;

      const preference = user.notificationPreference;
      // Default to true if no preference exists
      const dietUpdatesEnabled =
        preference?.dietUpdates !== undefined
          ? preference.dietUpdates
          : true;

      if (!dietUpdatesEnabled) return false;

      // Must have at least one push subscription
      if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        return false;
      }

      return true;
    })
    .map((diet) => ({
      dietId: diet.id,
      clientId: diet.client.id,
      clientName: `${diet.client.name} ${diet.client.surname}`,
      createdAt: diet.createdAt,
      user: diet.client.user!,
    }));

  return eligibleDiets;
}

/**
 * Send new diet notification to a client.
 * Returns counts so callers can surface how many devices received the push.
 */
export async function sendNewDietNotification(
  notification: NewDietNotification & { user: any }
): Promise<{ sent: number; failed: number }> {
  const { dietId, clientName, user } = notification;

  const title = "Yeni diyet programınız hazır! 🎉";
  const body = "Diyetisyeniniz size yeni bir beslenme programı hazırladı.";
  const url = `/client/diets/${dietId}`;
  const notificationTag = `new-diet-${dietId}`;

  let sent = 0;
  let failed = 0;

  // Send to all push subscriptions for this user
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
          body,
          url,
          tag: notificationTag,
          requireInteraction: false,
          data: {
            type: "new_diet",
            dietId,
            clientName,
          },
        }
      );
      sent++;
    } catch (error: any) {
      console.error(
        `Failed to send new diet notification to ${subscription.endpoint}:`,
        error
      );
      failed++;

      // If subscription is invalid, delete it
      if (
        error.statusCode === 410 ||
        error.statusCode === 404 ||
        (error.message && error.message.includes("expired"))
      ) {
        try {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
          console.log(`Deleted invalid push subscription ${subscription.id}`);
        } catch (deleteError) {
          console.error(
            `Failed to delete invalid push subscription ${subscription.id}:`,
            deleteError
          );
        }
      }
    }
  }

  return { sent, failed };
}

/**
 * Send new diet notifications for all eligible diets
 */
export async function sendNewDietNotifications(): Promise<void> {
  try {
    const eligibleDiets = await getNewDietsForNotification();

    console.log(
      `Found ${eligibleDiets.length} new diets eligible for notification`
    );

    for (const diet of eligibleDiets) {
      try {
        await sendNewDietNotification(diet as any);
        await prisma.diet.update({
          where: { id: diet.dietId },
          data: { notifiedAt: new Date() },
        });
        console.log(
          `Sent new diet notification for diet ${diet.dietId} to client ${diet.clientId}`
        );
      } catch (error) {
        console.error(
          `Failed to send new diet notification for diet ${diet.dietId}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Error in sendNewDietNotifications:", error);
    throw error;
  }
}

/**
 * Send a new diet notification for a single diet right after creation.
 * Sets notifiedAt on success so the cron safety net doesn't double-send.
 * Swallows errors — never blocks the diet creation request.
 *
 * When `options.force` is true, bypasses the `notifiedAt` guard and the
 * `dietUpdates` preference, and does NOT update `notifiedAt`. This is used
 * by the dietitian-triggered manual "send notification now" button.
 */
export async function notifyClientOfNewDiet(
  dietId: number,
  options?: { force?: boolean }
): Promise<{
  ok: boolean;
  sent: number;
  failed: number;
  reason?: "diet-not-found" | "no-user" | "preference-disabled" | "no-subscriptions";
}> {
  const force = options?.force === true;
  try {
    const diet = await prisma.diet.findUnique({
      where: { id: dietId },
      include: {
        client: {
          include: {
            user: {
              include: {
                notificationPreference: true,
                pushSubscriptions: true,
              },
            },
          },
        },
      },
    });

    if (!diet) {
      return { ok: false, sent: 0, failed: 0, reason: "diet-not-found" };
    }

    if (!force && diet.notifiedAt) {
      return { ok: true, sent: 0, failed: 0 };
    }

    const user = diet.client.user;
    if (!user) {
      return { ok: false, sent: 0, failed: 0, reason: "no-user" };
    }

    if (!force) {
      const dietUpdatesEnabled =
        user.notificationPreference?.dietUpdates !== undefined
          ? user.notificationPreference.dietUpdates
          : true;
      if (!dietUpdatesEnabled) {
        return { ok: false, sent: 0, failed: 0, reason: "preference-disabled" };
      }
    }

    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return { ok: false, sent: 0, failed: 0, reason: "no-subscriptions" };
    }

    const result = await sendNewDietNotification({
      dietId: diet.id,
      clientId: diet.client.id,
      clientName: `${diet.client.name} ${diet.client.surname}`,
      createdAt: diet.createdAt,
      user,
    } as any);

    if (!force) {
      await prisma.diet.update({
        where: { id: diet.id },
        data: { notifiedAt: new Date() },
      });
    }

    console.log(
      `Sent ${force ? "manual" : "immediate"} new diet notification for diet ${diet.id}`
    );

    return { ok: true, sent: result.sent, failed: result.failed };
  } catch (error) {
    console.error(
      `Failed to send new diet notification for diet ${dietId}:`,
      error
    );
    return { ok: false, sent: 0, failed: 0 };
  }
}

