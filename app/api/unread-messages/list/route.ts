import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

// Handle CORS preflight
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

/**
 * GET /api/unread-messages/list
 * 
 * Returns detailed list of all unread messages for the authenticated user
 * - For clients: unread messages from their dietitian
 * - For dietitians: unread messages from all their clients
 */
export async function GET(request: NextRequest) {
  try {
    console.log("📧 Unread messages list request received");
    
    // Authenticate request
    const auth = await authenticateRequest(request);
    console.log("🔐 Auth result:", {
      authenticated: !!auth.user,
      userId: auth.user?.id,
      role: auth.user?.role,
    });
    
    if (!auth.user) {
      console.log("❌ Unauthorized: No user found in request");
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    console.log(`✅ User authenticated: ${auth.user.role} (ID: ${auth.user.id})`);

    let unreadMessages;

    if (auth.user.role === "client") {
      // Get client's own unread messages
      const client = await prisma.client.findUnique({
        where: { userId: auth.user.id },
        select: { id: true },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 })
        );
      }

      // Get all diets for this client with unread messages
      unreadMessages = await prisma.dietComment.findMany({
        where: {
          diet: {
            clientId: client.id,
          },
          isRead: false,
          userId: { not: auth.user.id }, // Only messages from dietitian
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          diet: {
            select: {
              id: true,
              tarih: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                },
              },
            },
          },
          ogun: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Dietitian: Get unread messages from all their clients
      unreadMessages = await prisma.dietComment.findMany({
        where: {
          diet: {
            client: {
              dietitianId: auth.user.id,
            },
          },
          isRead: false,
          userId: { not: auth.user.id }, // Only messages from clients
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          diet: {
            select: {
              id: true,
              tarih: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                },
              },
            },
          },
          ogun: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // Group messages by client/diet for better organization
    const groupedMessages = unreadMessages.reduce((acc, msg) => {
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
          latestMessage: null, // Will be set to the most recent message
        };
      }

      const messageData = {
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        ogun: msg.ogun,
        senderName: msg.user.role === "client" 
          ? `${msg.diet.client.name} ${msg.diet.client.surname}`
          : "Diyetisyen",
      };

      acc[key].messages.push(messageData);
      acc[key].unreadCount++;

      // Update latestMessage if this is more recent
      if (!acc[key].latestMessage || new Date(msg.createdAt) > new Date(acc[key].latestMessage.createdAt)) {
        acc[key].latestMessage = messageData;
      }

      return acc;
    }, {} as Record<string, any>);

    // Convert to array
    const groupedArray = Object.values(groupedMessages);

    console.log(`✅ Found ${unreadMessages.length} unread messages in ${groupedArray.length} conversations`);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        totalUnread: unreadMessages.length,
        conversations: groupedArray,
        messages: unreadMessages, // Also return flat list for flexibility
      })
    );
  } catch (error) {
    console.error("Error fetching unread messages list:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to fetch unread messages" },
        { status: 500 }
      )
    );
  }
}

