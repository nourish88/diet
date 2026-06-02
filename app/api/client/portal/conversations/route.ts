import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export interface Conversation {
  dietId: number;
  dietDate: string | null;
  totalMessages: number;
  unreadCount: number;
  lastMessage: {
    id: number;
    content: string;
    createdAt: string;
    userId: number;
    userRole: string;
    ogun: { id: number; name: string } | null;
  } | null;
}

/**
 * GET /api/client/portal/conversations — diet-by-diet message summary for the signed-in client.
 */
export const GET = route({
  cors: true,
  auth: "client",
  scope: "portal.conversations",
  handler: async ({ auth }) => {
    const client = await prisma.client.findUnique({
      where: { userId: auth.user!.id },
      select: { id: true },
    });
    if (!client) throw new HttpError("not_found", "Client not found");

    const diets = await prisma.diet.findMany({
      where: { clientId: client.id },
      select: {
        id: true,
        tarih: true,
        createdAt: true,
        _count: { select: { comments: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            userId: true,
            isRead: true,
            user: { select: { role: true } },
            ogun: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const unreadCounts = await prisma.dietComment.groupBy({
      by: ["dietId"],
      where: {
        dietId: { in: diets.map((d) => d.id) },
        isRead: false,
        userId: { not: auth.user!.id },
      },
      _count: { id: true },
    });

    const unreadCountMap = new Map(
      unreadCounts.map((item) => [item.dietId, item._count.id]),
    );

    const conversations: Conversation[] = diets.map((diet) => {
      const lastComment = diet.comments[0] ?? null;
      return {
        dietId: diet.id,
        dietDate: diet.tarih ? diet.tarih.toISOString() : null,
        totalMessages: diet._count.comments,
        unreadCount: unreadCountMap.get(diet.id) ?? 0,
        lastMessage: lastComment
          ? {
              id: lastComment.id,
              content: lastComment.content,
              createdAt: lastComment.createdAt.toISOString(),
              userId: lastComment.userId,
              userRole: lastComment.user.role,
              ogun: lastComment.ogun,
            }
          : null,
      };
    });

    conversations.sort((a, b) => {
      const aDate = a.lastMessage
        ? new Date(a.lastMessage.createdAt).getTime()
        : a.dietDate
          ? new Date(a.dietDate).getTime()
          : 0;
      const bDate = b.lastMessage
        ? new Date(b.lastMessage.createdAt).getTime()
        : b.dietDate
          ? new Date(b.dietDate).getTime()
          : 0;
      return bDate - aDate;
    });

    return { success: true, conversations };
  },
});
