import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const GET = route<undefined, {}>({
  auth: "dietitian",
  scope: "dietitian.conversations.list",
  handler: async ({ auth, log }) => {
    try {
      const dietitianId = auth.user!.id;

      // Get all diets owned by this dietitian (or by their clients) that have comments
      const diets = await prisma.diet.findMany({
        where: {
          comments: { some: {} },
          OR: [
            { dietitianId },
            { client: { dietitianId } },
          ],
        },
        select: {
          id: true,
          tarih: true,
          createdAt: true,
          client: {
            select: {
              id: true,
              name: true,
              surname: true,
            },
          },
          comments: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              isRead: true,
              userId: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              comments: {
                where: {
                  isRead: false,
                  userId: { not: dietitianId },
                },
              },
            },
          },
        },
      });

      const transformedConversations = diets.map((diet) => {
        const lastMessage = diet.comments[0];
        const dietDate = diet.tarih ?? diet.createdAt;

        return {
          clientId: diet.client.id,
          clientName: `${diet.client.name} ${diet.client.surname}`,
          dietId: diet.id,
          dietName: `Diyet #${diet.id}`,
          lastMessage: lastMessage?.content || "",
          lastMessageTime: lastMessage?.createdAt || dietDate,
          lastMessageFromClient: lastMessage?.userId !== dietitianId,
          unreadCount: diet._count.comments,
        };
      });

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
      log.error(
        "conversations list failed",
        err instanceof Error ? err.message : err
      );
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }
  },
});
