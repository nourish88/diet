import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { PUBLIC_DIETITIAN_NAME } from "@/lib/brand-identity";

export const dynamic = "force-dynamic";

export const GET = route({
  auth: "client",
  scope: "client.notifications.list",
  handler: async ({ auth }) => {
    const client = await prisma.client.findUnique({
      where: { userId: auth.user!.id },
      select: { id: true },
    });
    if (!client) throw new HttpError("not_found", "Danışan kaydı bulunamadı.");

    // Read notifications leave the active inbox after 90 days, but are never
    // deleted. Unread messages stay visible regardless of age.
    const archiveCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await prisma.broadcastRecipient.updateMany({
      where: {
        clientId: client.id,
        isRead: true,
        archivedAt: null,
        createdAt: { lt: archiveCutoff },
      },
      data: { archivedAt: new Date() },
    });

    const [notifications, unreadCount] = await Promise.all([
      prisma.broadcastRecipient.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          isRead: true,
          readAt: true,
          archivedAt: true,
          createdAt: true,
          actionUrl: true,
          weeklyCheckInId: true,
          broadcastMessage: {
            select: { id: true, title: true, message: true, type: true, dietitianName: true, createdAt: true },
          },
        },
      }),
      prisma.broadcastRecipient.count({
        where: { clientId: client.id, isRead: false, archivedAt: null },
      }),
    ]);
    return {
      notifications: notifications.map((notification) => ({
        ...notification,
        broadcastMessage: {
          ...notification.broadcastMessage,
          dietitianName: PUBLIC_DIETITIAN_NAME,
        },
      })),
      unreadCount,
    };
  },
});
