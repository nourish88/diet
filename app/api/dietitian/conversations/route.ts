import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const GET = route<undefined, {}>({
  auth: "dietitian",
  scope: "dietitian.conversations.list",
  handler: async ({ auth, log }) => {
    try {
      const dietitianId = auth.user!.id;

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
          },
        },
      });

      log.info(`Found ${diets.length} diets with comments for dietitian ${dietitianId}`);

      const transformedConversations = diets.map((diet) => {
        const lastMessage = diet.comments[0];
        const dietDate = diet.tarih ?? diet.createdAt;
        const unreadCount = diet.comments.filter(
          (c) => !c.isRead && c.userId !== dietitianId
        ).length;

        return {
          clientId: diet.client.id,
          clientName: `${diet.client.name} ${diet.client.surname}`,
          dietId: diet.id,
          dietName: `Diyet #${diet.id}`,
          lastMessage: lastMessage?.content || "",
          lastMessageTime: lastMessage?.createdAt || dietDate,
          lastMessageFromClient: lastMessage?.userId !== dietitianId,
          unreadCount,
        };
      });

      transformedConversations.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
      );

      return NextResponse.json({
        success: true,
        count: transformedConversations.length,
        conversations: transformedConversations,
      });
    } catch (err) {
      log.error(
        "conversations list failed",
        err instanceof Error ? err.message : err
      );
      return NextResponse.json(
        {
          error: "Failed to fetch conversations",
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      );
    }
  },
});
