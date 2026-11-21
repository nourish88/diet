import prisma from "@/lib/prisma";
import { persistApplicationErrors, type ServerErrorInput } from "@/lib/application-error-server";

/** Snapshot before short-lived delivery logs expire. An absent ack is an uncertainty, not proof of loss. */
export async function collectNotificationErrors() {
  const cutoff = new Date(Date.now() - 15 * 60000);
  const since = new Date(Date.now() - 3 * 86400000);
  const recorded = await prisma.applicationError.findMany({
    where: { createdAt: { gte: since }, OR: [{ eventId: { startsWith: "notification:" } }, { eventId: { startsWith: "broadcast:" } }] },
    select: { eventId: true },
  });
  const knownIds = (prefix: string, status: string) => recorded.flatMap(({ eventId }) => {
    const [kind, id, state] = eventId.split(":");
    return kind === prefix && state === status && /^\d+$/.test(id) ? [Number(id)] : [];
  });
  const logs = await prisma.notificationLog.findMany({
    where: { sentAt: { gte: since, lt: cutoff }, OR: [
      { status: "failed", id: { notIn: knownIds("notification", "failed") } },
      { status: "pending", receivedAt: null, id: { notIn: knownIds("notification", "pending") } },
      { status: "success", receivedAt: null, id: { notIn: knownIds("notification", "unconfirmed") } },
    ] },
    orderBy: { id: "desc" }, take: 500,
    select: { id: true, status: true, sentAt: true, pushStatusCode: true, user: { select: { supabaseId: true } } },
  });
  await persistApplicationErrors(prisma, logs.map((log): ServerErrorInput => ({
    eventId: `notification:${log.id}:${log.status === "success" ? "unconfirmed" : log.status}`,
    code: log.status === "success" ? "delivery_unconfirmed" : "push_failed",
    path: "/api/cron/meal-reminders", subject: log.user.supabaseId,
    referenceId: log.id, occurredAt: log.sentAt,
    status: log.pushStatusCode && log.pushStatusCode >= 400 ? log.pushStatusCode : undefined,
  })));
  const broadcasts = await prisma.broadcastRecipient.findMany({
    where: { createdAt: { gte: since }, OR: [
      ...["failed", "partial", "not_subscribed", "push_unavailable", "pending"].map((status) => ({ deliveryStatus: status, createdAt: { lt: cutoff }, id: { notIn: knownIds("broadcast", status) } })),
      { deliveryStatus: "sent", deliveredAt: null, pushSentAt: { lt: cutoff }, id: { notIn: knownIds("broadcast", "sent") } },
    ] },
    take: 500, orderBy: { id: "desc" },
    select: { id: true, deliveryStatus: true, createdAt: true, pushSentAt: true, client: { select: { user: { select: { supabaseId: true } } } } },
  });
  await persistApplicationErrors(prisma, broadcasts.map((item): ServerErrorInput => ({
    eventId: `broadcast:${item.id}:${item.deliveryStatus}`,
    code: item.deliveryStatus === "sent" ? "delivery_unconfirmed" : "push_failed",
    path: "/api/notifications/broadcast", subject: item.client?.user?.supabaseId,
    occurredAt: item.pushSentAt ?? item.createdAt,
  })));
  // Technical incidents have a separate retention period from notification history.
  await prisma.applicationError.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } } });
}
