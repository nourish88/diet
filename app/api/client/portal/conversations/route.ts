import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

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
    ogun: {
      id: number;
      name: string;
    } | null;
  } | null;
}

/**
 * GET /api/client/portal/conversations
 * 
 * Returns all conversations (diets with messages) for the authenticated client
 * - All diets are returned, even if they have no messages
 * - Each conversation includes:
 *   - Diet ID and date
 *   - Total message count
 *   - Unread message count
 *   - Last message information
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    if (auth.user.role !== "client") {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Only clients can access this resource" },
          { status: 403 }
        )
      );
    }

    // Get client
    const client = await prisma.client.findUnique({
      where: { userId: auth.user.id },
      select: { id: true },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    // Get all diets for this client with message statistics
    const diets = await prisma.diet.findMany({
      where: { clientId: client.id },
      select: {
        id: true,
        tarih: true,
        createdAt: true,
        _count: {
          select: {
            comments: true,
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            userId: true,
            isRead: true,
            user: {
              select: {
                role: true,
              },
            },
            ogun: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get unread counts for all diets in a single query
    const unreadCounts = await prisma.dietComment.groupBy({
      by: ["dietId"],
      where: {
        dietId: { in: diets.map((d) => d.id) },
        isRead: false,
        userId: { not: auth.user.id }, // Only messages from dietitian
      },
      _count: {
        id: true,
      },
    });

    // Create a map of dietId -> unreadCount
    const unreadCountMap = new Map(
      unreadCounts.map((item) => [item.dietId, item._count.id])
    );

    // Build conversations array
    const conversations: Conversation[] = diets.map((diet) => {
      const lastComment = diet.comments[0] || null;
      const unreadCount = unreadCountMap.get(diet.id) || 0;

      return {
        dietId: diet.id,
        dietDate: diet.tarih ? diet.tarih.toISOString() : null,
        totalMessages: diet._count.comments,
        unreadCount,
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

    // Sort by last message date (most recent first), then by diet date
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

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        conversations,
      })
    );
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      )
    );
  }
}

