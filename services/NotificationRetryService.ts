import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { HttpError } from "@/lib/api/handler";
import { RETRY_WAIT_MS } from "@/lib/notification-log";
import { notificationDeviceSnapshot, pushErrorStatusCode, retryAttemptSelect, retrySourceSelect } from "@/lib/notification-log-snapshot";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";
import { isLoggingEnabled } from "@/lib/logging-settings";

export async function readNotificationForRetry(id: number, dietitianId: number) {
  const source = await prisma.notificationLog.findFirst({
    where: { id, client: { dietitianId }, type: { not: "delivery_test" } },
    select: {
      ...retrySourceSelect, clientId: true, userId: true, replacementSubscriptionId: true,
      client: { select: { userId: true, isActive: true } },
      user: { select: { notificationPreference: { select: { mealReminders: true } } } },
    },
  });
  if (!source) throw new HttpError("not_found", "Bu bildirimin cihaz bilgisine artık ulaşılamıyor.");
  return source;
}

export async function retryNotification(id: number, dietitianId: number, previousAttemptId: number) {
  const source = await readNotificationForRetry(id, dietitianId);
  const previous = source.retries[0];
  if (source.receivedAt || previous?.receivedAt || (previous?.id ?? 0) !== previousAttemptId ||
      (previous && Date.now() - previous.sentAt.getTime() < RETRY_WAIT_MS)) {
    return { receivedAt: source.receivedAt, attempt: previous ?? null };
  }
  if (!await isLoggingEnabled(prisma, "notification_logging_enabled")) {
    throw new HttpError("conflict", "Deneme sonucunu görmek için Bildirim kayıtları ayarını açın.");
  }
  if (!source.client.isActive || source.client.userId !== source.userId || source.user.notificationPreference?.mealReminders === false) {
    throw new HttpError("conflict", "Danışanın hesabı veya bildirim tercihleri bu denemeye uygun değil.");
  }
  const targetId = source.replacementSubscriptionId ?? source.subscriptionId;
  const subscription = targetId && await prisma.pushSubscription.findFirst({
    where: { id: targetId, userId: source.userId },
  });
  if (!subscription) throw new HttpError("conflict", "Bu telefonun bildirim kaydı bulunamadı. Danışandan uygulamada bildirimleri açmasını isteyin.");
  if (!isWebPushConfigured()) throw new HttpError("conflict", "Bildirim hizmeti şu anda kullanılamıyor.");

  const title = "Deneme bildirimi";
  const body = "Diyetisyeniniz bildirimlerin telefonunuza ulaşıp ulaşmadığını kontrol ediyor.";
  let attempt: { id: number };
  try {
    attempt = await prisma.notificationLog.create({
      data: {
        retryOfId: id, retryAfterId: previousAttemptId, type: "delivery_test",
        userId: source.userId, clientId: source.clientId, status: "pending", title, body,
        ...notificationDeviceSnapshot(subscription),
      }, select: { id: true },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const current = await readNotificationForRetry(id, dietitianId);
    return { receivedAt: current.receivedAt, attempt: current.retries[0] ?? null };
  }
  let outcome: Prisma.NotificationLogUpdateInput = { status: "success" };
  try {
    await sendWebPushNotification({
      endpoint: subscription.endpoint, keys: { auth: subscription.auth, p256dh: subscription.p256dh },
    }, { title, body, tag: `delivery-test-${attempt.id}`, url: "/client/settings", data: { logId: attempt.id } }, { urgency: "high" });
  } catch (error) {
    outcome = { status: "failed", pushStatusCode: pushErrorStatusCode(error), errorMessage: "Deneme bildirimi gönderilemedi." };
  }
  const result = await prisma.notificationLog.update({ where: { id: attempt.id }, data: outcome, select: retryAttemptSelect });
  return { receivedAt: source.receivedAt, attempt: result };
}
