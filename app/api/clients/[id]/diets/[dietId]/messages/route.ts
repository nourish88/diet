import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import { sendExpoPushNotification } from "@/lib/expo-push";

// GET - Get all messages/comments for a diet (conversation history)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; dietId: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const clientId = parseInt(params.id);
    const dietId = parseInt(params.dietId);

    if (isNaN(clientId) || isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      );
    }

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        surname: true,
        userId: true,
        dietitianId: true,
      },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    // Authorization
    const isOwnClient = auth.user.role === "client" && client.userId === auth.user.id;
    const isOwnDietitian = auth.user.role === "dietitian" && client.dietitianId === auth.user.id;

    if (!isOwnClient && !isOwnDietitian) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    // Get all messages for this diet
    const messages = await prisma.dietComment.findMany({
      where: {
        dietId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        ogun: {
          select: {
            id: true,
            name: true,
          },
        },
        photos: {
          where: {
            expiresAt: {
              gte: new Date(), // Only non-expired photos
            },
          },
          select: {
            id: true,
            imageData: true,
            uploadedAt: true,
            expiresAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc", // Chronological order
      },
    });

    // Count unread messages for this user
    const unreadCount = messages.filter(
      (msg) => !msg.isRead && msg.userId !== auth.user!.id
    ).length;

    console.log(`✅ Fetched ${messages.length} messages for diet ${dietId} (${unreadCount} unread)`);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        messages,
        unreadCount,
      })
    );
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to fetch messages" },
        { status: 500 }
      )
    );
  }
}

// POST - Send a new message (client can send text+photo, dietitian only text)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; dietId: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const clientId = parseInt(params.id);
    const dietId = parseInt(params.dietId);

    if (isNaN(clientId) || isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      );
    }

    const body = await request.json();
    const { content, ogunId, photos } = body;

    if (!content || content.trim() === "") {
      return addCorsHeaders(
        NextResponse.json({ error: "Message content required" }, { status: 400 })
      );
    }

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        surname: true,
        userId: true,
        dietitianId: true,
      },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    // Authorization
    const isOwnClient = auth.user.role === "client" && client.userId === auth.user.id;
    const isOwnDietitian = auth.user.role === "dietitian" && client.dietitianId === auth.user.id;

    if (!isOwnClient && !isOwnDietitian) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    // Only clients can send photos
    if (photos && photos.length > 0 && auth.user.role !== "client") {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Only clients can send photos" },
          { status: 403 }
        )
      );
    }

    console.log(`💬 Creating message from ${auth.user.role} (${auth.user.email})`);

    // Create message with photos in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the comment/message
      const message = await tx.dietComment.create({
        data: {
          content: content.trim(),
          userId: auth.user!.id,
          dietId,
          ogunId: ogunId || null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
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
      });

      // If photos provided, create them
      if (photos && photos.length > 0 && auth.user!.role === "client") {
        const photoData = photos.map((photo: any) => ({
          imageData: photo.imageData,
          dietId,
          ogunId: ogunId || null,
          clientId,
          commentId: message.id,
          uploadedAt: new Date(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        }));

        const createResult = await tx.mealPhoto.createMany({
          data: photoData,
        });

        console.log(`📸 Created ${createResult.count} photos for message ${message.id}`);
      }

      // Fetch complete message with photos
      const completeMessage = await tx.dietComment.findUnique({
        where: { id: message.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          ogun: {
            select: {
              id: true,
              name: true,
            },
          },
          photos: {
            select: {
              id: true,
              imageData: true,
              uploadedAt: true,
              expiresAt: true,
            },
          },
        },
      });

      return completeMessage;
    });

    console.log(`✅ Message created: ${result!.id}`);

    // Send push notification
    try {
      if (auth.user!.role === "client") {
        // Client sent message → notify dietitian
        console.log(`📤 Client (${client.name} ${client.surname}) sent message, notifying dietitian...`);
        
        const dietitian = await prisma.user.findUnique({
          where: { id: client.dietitianId! },
          select: { pushToken: true, email: true },
        });

        if (dietitian?.pushToken) {
          console.log(`✅ Found dietitian push token: ${dietitian.pushToken.substring(0, 20)}...`);
          await sendExpoPushNotification(
            dietitian.pushToken,
            `Yeni Mesaj: ${client.name} ${client.surname}`,
            result!.content.substring(0, 100),
            {
              type: "new_message",
              messageId: result!.id,
              dietId,
              clientId,
              clientName: `${client.name} ${client.surname}`,
            }
          );
          console.log(`🔔 Push notification sent to dietitian (${dietitian.email})`);
        } else {
          console.log(`⚠️ Dietitian has no push token (${dietitian?.email || 'unknown'})`);
        }
      } else {
        // Dietitian sent message → notify client
        console.log(`📤 Dietitian sent message to client (${client.name} ${client.surname}), notifying...`);
        
        if (client.userId) {
          const clientUser = await prisma.user.findUnique({
            where: { id: client.userId },
            select: { pushToken: true, email: true },
          });

          if (clientUser?.pushToken) {
            console.log(`✅ Found client push token: ${clientUser.pushToken.substring(0, 20)}...`);
            await sendExpoPushNotification(
              clientUser.pushToken,
              "Diyetisyeninizden Yeni Mesaj",
              result!.content.substring(0, 100),
              {
                type: "new_message",
                messageId: result!.id,
                dietId,
                clientId,
              }
            );
            console.log(`🔔 Push notification sent to client (${clientUser.email})`);
          } else {
            console.log(`⚠️ Client has no push token (${clientUser?.email || 'unknown'})`);
          }
        } else {
          console.log(`⚠️ Client (${client.name} ${client.surname}) has no userId assigned`);
        }
      }
    } catch (pushError) {
      console.error("❌ Push notification error:", pushError);
      // Don't fail the request if push notification fails
    }

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: result,
      })
    );
  } catch (error: any) {
    console.error("Error creating message:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to create message" },
        { status: 500 }
      )
    );
  }
}

// PATCH - Mark messages as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; dietId: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const clientId = parseInt(params.id);
    const dietId = parseInt(params.dietId);

    if (isNaN(clientId) || isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      );
    }

    const body = await request.json();
    const { messageIds } = body; // Array of message IDs to mark as read

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "messageIds array is required" },
          { status: 400 }
        )
      );
    }

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        userId: true,
        dietitianId: true,
      },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    // Authorization
    const isOwnClient = auth.user.role === "client" && client.userId === auth.user.id;
    const isOwnDietitian = auth.user.role === "dietitian" && client.dietitianId === auth.user.id;

    if (!isOwnClient && !isOwnDietitian) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    console.log(`📖 Marking ${messageIds.length} messages as read by ${auth.user.role}`);

    // Mark messages as read (only if they're from the other party)
    const result = await prisma.dietComment.updateMany({
      where: {
        id: { in: messageIds },
        dietId, // Must be in this diet
        userId: { not: auth.user.id }, // Can't mark own messages as read
        isRead: false, // Only update unread messages
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    console.log(`✅ Marked ${result.count} messages as read`);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        markedCount: result.count,
      })
    );
  } catch (error: any) {
    console.error("Error marking messages as read:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to mark messages as read" },
        { status: 500 }
      )
    );
  }
}

