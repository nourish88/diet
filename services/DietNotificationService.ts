import prisma from "@/lib/prisma";
import { sendWebPushNotification } from "@/lib/web-push";

export interface NewDietNotification {
  dietId: number;
  clientId: number;
  clientName: string;
  createdAt: Date;
}

/**
 * Get diets created in the last 15 minutes that haven't been notified yet
 */
export async function getNewDietsForNotification(): Promise<NewDietNotification[]> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const now = new Date();

  // Get diets created in the last 15 minutes
  const diets = await prisma.diet.findMany({
    where: {
      createdAt: {
        gte: fifteenMinutesAgo,
        lte: now,
      },
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
 * Send new diet notification to a client
 */
export async function sendNewDietNotification(
  notification: NewDietNotification & { user: any }
): Promise<void> {
  const { dietId, clientId, clientName, user } = notification;

  const title = "Yeni diyet programınız hazır! 🎉";
  const body = "Diyetisyeniniz size yeni bir beslenme programı hazırladı.";
  const url = `/client/diets/${dietId}`;
  const notificationTag = `new-diet-${dietId}`;

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
          },
        }
      );
    } catch (error: any) {
      console.error(
        `Failed to send new diet notification to ${subscription.endpoint}:`,
        error
      );

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

