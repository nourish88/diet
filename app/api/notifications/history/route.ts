import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

export const GET = route({
  auth: "dietitian",
  scope: "notifications.history",
  handler: async ({ auth }) => {
    const messages = await prisma.broadcastMessage.findMany({
      where: { dietitianId: auth.user!.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        message: true,
        createdAt: true,
        recipients: {
          orderBy: { clientName: "asc" },
          select: {
            id: true,
            clientId: true,
            clientName: true,
            deliveryStatus: true,
            subscriptionCount: true,
            sentCount: true,
            failedCount: true,
            pushSentAt: true,
            deliveredAt: true,
            errorMessage: true,
            isRead: true,
            readAt: true,
            archivedAt: true,
          },
        },
      },
    });

    return {
      messages: messages.map((message) => ({
        ...message,
        summary: {
          total: message.recipients.length,
          read: message.recipients.filter((item) => item.isRead).length,
          delivered: message.recipients.filter((item) => item.deliveredAt).length,
          notDelivered: message.recipients.filter((item) =>
            ["failed", "not_subscribed", "push_unavailable"].includes(item.deliveryStatus),
          ).length,
        },
      })),
    };
  },
});
