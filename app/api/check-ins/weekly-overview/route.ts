import prisma from "@/lib/prisma";
import { HttpError, route } from "@/lib/api/handler";

const WEEK_LIMIT = 52;

type DeliveryStatus =
  | "delivered"
  | "sent"
  | "partial"
  | "not_subscribed"
  | "preference_disabled"
  | "failed"
  | "push_unavailable"
  | "pending"
  | "not_created";

function parseWeekStart(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function deliveryStatus(
  notifications: Array<{
    deliveredAt: Date | null;
    sentCount: number;
    failedCount: number;
    deliveryStatus: string;
  }>,
): DeliveryStatus {
  if (!notifications.length) return "not_created";
  if (notifications.some((item) => item.deliveredAt)) return "delivered";

  const sentCount = notifications.reduce(
    (total, item) => total + item.sentCount,
    0,
  );
  const failedCount = notifications.reduce(
    (total, item) => total + item.failedCount,
    0,
  );
  if (sentCount > 0 && failedCount > 0) return "partial";
  if (sentCount > 0) return "sent";
  if (failedCount > 0) return "failed";

  const known = notifications[0]?.deliveryStatus as DeliveryStatus | undefined;
  return known ?? "pending";
}

export const GET = route({
  auth: "dietitian",
  scope: "check-ins.weekly-overview",
  handler: async ({ request, auth }) => {
    const dietitianId = auth.user!.id;
    const weekRows = await prisma.weeklyCheckIn.findMany({
      where: { dietitianId, isTest: false },
      distinct: ["weekStart"],
      orderBy: { weekStart: "desc" },
      take: WEEK_LIMIT,
      select: { weekStart: true },
    });

    if (!weekRows.length) {
      return {
        weeks: [],
        selectedWeek: null,
        summary: null,
        checkIns: [],
      };
    }

    const requestedWeek = parseWeekStart(
      request.nextUrl.searchParams.get("weekStart"),
    );
    const availableWeekKeys = new Set(
      weekRows.map((item) => dateKey(item.weekStart)),
    );
    if (requestedWeek && !availableWeekKeys.has(dateKey(requestedWeek))) {
      throw new HttpError("not_found", "Haftalık gönderim bulunamadı.");
    }
    const selectedWeek = requestedWeek ?? weekRows[0].weekStart;
    const availableWeeks = weekRows.map((item) => item.weekStart);

    const [weekCheckIns, selectedCheckIns] = await Promise.all([
      prisma.weeklyCheckIn.findMany({
        where: {
          dietitianId,
          isTest: false,
          weekStart: { in: availableWeeks },
        },
        select: {
          weekStart: true,
          status: true,
          sentAt: true,
          reminderSentAt: true,
          notifications: {
            select: {
              isRead: true,
              deliveredAt: true,
              sentCount: true,
              failedCount: true,
              deliveryStatus: true,
            },
          },
        },
      }),
      prisma.weeklyCheckIn.findMany({
        where: { dietitianId, isTest: false, weekStart: selectedWeek },
        orderBy: [{ client: { name: "asc" } }, { client: { surname: "asc" } }],
        select: {
          id: true,
          weekStart: true,
          status: true,
          sentAt: true,
          reminderSentAt: true,
          submittedAt: true,
          contactedAt: true,
          adherence: true,
          hunger: true,
          energy: true,
          sleep: true,
          water: true,
          exercise: true,
          challenge: true,
          supportRequest: true,
          client: { select: { id: true, name: true, surname: true } },
          notifications: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              deliveryStatus: true,
              subscriptionCount: true,
              sentCount: true,
              failedCount: true,
              pushSentAt: true,
              deliveredAt: true,
              isRead: true,
              readAt: true,
              errorMessage: true,
              createdAt: true,
              broadcastMessage: { select: { dedupeKey: true } },
            },
          },
        },
      }),
    ]);

    const weeks = weekRows.map(({ weekStart }) => {
      const items = weekCheckIns.filter(
        (item) => item.weekStart.getTime() === weekStart.getTime(),
      );
      return {
        weekStart: dateKey(weekStart),
        total: items.length,
        sent: items.filter((item) => item.sentAt).length,
        read: items.filter((item) =>
          item.notifications.some((notification) => notification.isRead),
        ).length,
        submitted: items.filter((item) => item.status === "submitted").length,
      };
    });

    const checkIns = selectedCheckIns.map((checkIn) => {
      const initialNotification = checkIn.notifications.find((item) =>
        item.broadcastMessage.dedupeKey?.endsWith(":initial"),
      );
      const reminderNotification = checkIn.notifications.find((item) =>
        item.broadcastMessage.dedupeKey?.endsWith(":reminder"),
      );
      const readNotification = checkIn.notifications.find((item) => item.isRead);

      return {
        id: checkIn.id,
        client: checkIn.client,
        status: checkIn.status,
        sentAt: checkIn.sentAt,
        reminderSentAt: checkIn.reminderSentAt,
        submittedAt: checkIn.submittedAt,
        contactedAt: checkIn.contactedAt,
        readAt: readNotification?.readAt ?? null,
        deliveryStatus: deliveryStatus(checkIn.notifications),
        initialNotification: initialNotification
          ? {
              createdAt: initialNotification.createdAt,
              subscriptionCount: initialNotification.subscriptionCount,
              sentCount: initialNotification.sentCount,
              failedCount: initialNotification.failedCount,
              pushSentAt: initialNotification.pushSentAt,
              deliveredAt: initialNotification.deliveredAt,
              errorMessage: initialNotification.errorMessage,
            }
          : null,
        reminderNotification: reminderNotification
          ? {
              createdAt: reminderNotification.createdAt,
              sentCount: reminderNotification.sentCount,
              deliveredAt: reminderNotification.deliveredAt,
            }
          : null,
        answers:
          checkIn.status === "submitted"
            ? {
                adherence: checkIn.adherence,
                hunger: checkIn.hunger,
                energy: checkIn.energy,
                sleep: checkIn.sleep,
                water: checkIn.water,
                exercise: checkIn.exercise,
                challenge: checkIn.challenge,
                supportRequest: checkIn.supportRequest,
              }
            : null,
      };
    });

    return {
      weeks,
      selectedWeek: dateKey(selectedWeek),
      summary: {
        total: checkIns.length,
        sent: checkIns.filter((item) => item.sentAt).length,
        pushDelivered: checkIns.filter(
          (item) => item.deliveryStatus === "delivered",
        ).length,
        read: checkIns.filter((item) => item.readAt).length,
        submitted: checkIns.filter((item) => item.status === "submitted").length,
        reminded: checkIns.filter((item) => item.reminderSentAt).length,
        failed: checkIns.filter((item) => item.deliveryStatus === "failed").length,
      },
      checkIns,
    };
  },
});
