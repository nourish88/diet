import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const GET = route<undefined, {}>({
  auth: "dietitian",
  scope: "dietitian.conversations.list",
  handler: async ({ auth, log }) => {
    try {
      const dietitianId = auth.user!.id;

      // Get all clients for this dietitian with their last message and conversation status
      const conversations = await prisma.client.findMany({
        where: {
          dietitianId,
        },
        select: {
          id: true,
          name: true,
          surname: true,
          userId: true,
          diets: {
            select: {
              id: true,
              tarih: true,
              createdAt: true,
              comments: {
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  isRead: true,
                  userId: true,
                  user: {
                    select: {
                      role: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
            where: {
              comments: {
                some: {},
              },
            },
          },
        },
      });

      // Transform data to include last message and unread count
      const transformedConversations = conversations.flatMap((client) =>
        client.diets.map((diet) => {
          const lastMessage = diet.comments[0];
          const unreadCount = diet.comments.filter(
            (msg) => !msg.isRead && msg.userId !== dietitianId
          ).length;
          const dietDate = diet.tarih ?? diet.createdAt;

          return {
            clientId: client.id,
            clientName: `${client.name} ${client.surname}`,
            dietId: diet.id,
            dietName: `Diyet #${diet.id}`,
            lastMessage: lastMessage?.content || "",
            lastMessageTime: lastMessage?.createdAt || dietDate,
            lastMessageFromClient: lastMessage?.userId !== dietitianId,
            unreadCount,
          };
        })
      );

      // Sort by last message time (newest first)
      transformedConversations.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
      );

      return NextResponse.json({
        success: true,
        conversations: transformedConversations,
      });
    } catch (err) {
      log.error("conversations list failed", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }
  },
});
