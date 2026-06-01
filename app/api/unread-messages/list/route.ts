import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

const MESSAGE_INCLUDE = {
  user: { select: { id: true, email: true, role: true } },
  diet: {
    select: {
      id: true,
      tarih: true,
      client: { select: { id: true, name: true, surname: true } },
    },
  },
  ogun: { select: { id: true, name: true } },
} satisfies Prisma.DietCommentInclude;

type UnreadMessage = Prisma.DietCommentGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

interface MessageData {
  id: number;
  content: string;
  createdAt: Date;
  ogun: { id: number; name: string } | null;
  senderName: string;
}

interface Conversation {
  clientId: number;
  clientName: string;
  dietId: number;
  dietDate: Date | null;
  messages: MessageData[];
  unreadCount: number;
  latestMessage: MessageData | null;
}

/**
 * GET /api/unread-messages/list — detailed unread messages for the signed-in user.
 * Clients see messages from their dietitian; dietitians see messages from their clients.
 */
export const GET = route({
  auth: "any",
  scope: "unread-messages.list",
  handler: async ({ auth, log }) => {
    try {
      const user = auth.user!;
      let unreadMessages: UnreadMessage[];

      if (user.role === "client") {
        const client = await prisma.client.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!client) {
          return addCorsHeaders(
            NextResponse.json({ error: "Client not found" }, { status: 404 }),
          );
        }
        unreadMessages = await prisma.dietComment.findMany({
          where: {
            diet: { clientId: client.id },
            isRead: false,
            userId: { not: user.id },
          },
          include: MESSAGE_INCLUDE,
          orderBy: { createdAt: "desc" },
        });
      } else {
        unreadMessages = await prisma.dietComment.findMany({
          where: {
            diet: { client: { dietitianId: user.id } },
            isRead: false,
            userId: { not: user.id },
          },
          include: MESSAGE_INCLUDE,
          orderBy: { createdAt: "desc" },
        });
      }

      const groupedMessages = unreadMessages.reduce<Record<string, Conversation>>(
        (acc, msg) => {
          const clientId = msg.diet.client.id;
          const dietId = msg.diet.id;
          const key = `${clientId}-${dietId}`;

          if (!acc[key]) {
            acc[key] = {
              clientId,
              clientName: `${msg.diet.client.name} ${msg.diet.client.surname}`,
              dietId,
              dietDate: msg.diet.tarih,
              messages: [],
              unreadCount: 0,
              latestMessage: null,
            };
          }

          const messageData: MessageData = {
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            ogun: msg.ogun,
            senderName:
              msg.user.role === "client"
                ? `${msg.diet.client.name} ${msg.diet.client.surname}`
                : "Diyetisyen",
          };

          acc[key].messages.push(messageData);
          acc[key].unreadCount++;

          if (
            !acc[key].latestMessage ||
            new Date(msg.createdAt) > new Date(acc[key].latestMessage!.createdAt)
          ) {
            acc[key].latestMessage = messageData;
          }

          return acc;
        },
        {},
      );

      const conversations = Object.values(groupedMessages);

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          totalUnread: unreadMessages.length,
          conversations,
          messages: unreadMessages,
        }),
      );
    } catch (err) {
      log.error("list failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to fetch unread messages" },
          { status: 500 },
        ),
      );
    }
  },
});
