import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

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

    const [notifications, unreadCount] = await Promise.all([
      prisma.broadcastRecipient.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          isRead: true,
          readAt: true,
          createdAt: true,
          broadcastMessage: {
            select: { id: true, title: true, message: true, dietitianName: true, createdAt: true },
          },
        },
      }),
      prisma.broadcastRecipient.count({ where: { clientId: client.id, isRead: false } }),
    ]);
    return { notifications, unreadCount };
  },
});
