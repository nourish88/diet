import prisma from "@/lib/prisma";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";

export async function notifyDietitianOfDissatisfiedCheckIn(checkInId: number) {
  if (!isWebPushConfigured()) return { sent: 0, failed: 0 };

  const checkIn = await prisma.weeklyCheckIn.findUnique({
    where: { id: checkInId },
    select: {
      id: true,
      satisfaction: true,
      client: { select: { id: true, name: true, surname: true } },
      dietitian: {
        select: {
          pushSubscriptions: {
            select: { id: true, endpoint: true, auth: true, p256dh: true },
          },
        },
      },
    },
  });

  if (!checkIn || checkIn.satisfaction === null || checkIn.satisfaction > 2) {
    return { sent: 0, failed: 0 };
  }

  const clientName = `${checkIn.client.name} ${checkIn.client.surname}`.trim();
  let sent = 0;
  let failed = 0;
  for (const subscription of checkIn.dietitian.pushSubscriptions) {
    try {
      await sendWebPushNotification(
        {
          endpoint: subscription.endpoint,
          keys: { auth: subscription.auth, p256dh: subscription.p256dh },
        },
        {
          title: "Danışanınız desteğe ihtiyaç duyuyor",
          body: `${clientName}, haftalık kontrolde memnuniyetini düşük bildirdi.`,
          url: `/diets/new?clientId=${checkIn.client.id}`,
          tag: `dissatisfied-check-in-${checkIn.id}`,
          requireInteraction: true,
          data: {
            type: "dissatisfied_check_in",
            checkInId: checkIn.id,
            clientId: checkIn.client.id,
            url: `/diets/new?clientId=${checkIn.client.id}`,
          },
        },
      );
      sent++;
    } catch (error: unknown) {
      failed++;
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription
          .delete({ where: { id: subscription.id } })
          .catch(() => undefined);
      }
    }
  }
  return { sent, failed };
}
