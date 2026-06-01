import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { storeMealPhotoImage } from "@/lib/meal-photo-storage";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";
import { route } from "@/lib/api/handler";

type Params = { id: string; dietId: string };

const ACTIVE_THRESHOLD_MS = 30 * 1000;

async function notifyWebSubscribers(
  subscriptions: Array<{
    endpoint: string;
    auth: string;
    p256dh: string;
  }>,
  payload: Record<string, unknown>
) {
  if (!isWebPushConfigured() || subscriptions.length === 0) {
    return;
  }

  console.log(
    "[WebPush] Notifying subscribers",
    JSON.stringify({
      count: subscriptions.length,
      firstEndpoint: subscriptions[0]?.endpoint,
      payloadPreview: {
        title: (payload as any)?.title,
        url: (payload as any)?.url,
        data: (payload as any)?.data,
      },
    })
  );

  for (const subscription of subscriptions) {
    try {
      console.log(
        "[WebPush] Sending notification",
        JSON.stringify({
          endpoint: subscription.endpoint,
        })
      );

      await sendWebPushNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.auth,
            p256dh: subscription.p256dh,
          },
        },
        payload
      );

      console.log(
        "[WebPush] Notification sent successfully",
        JSON.stringify({
          endpoint: subscription.endpoint,
        })
      );
    } catch (error: any) {
      console.error("❌ Web push notification error:", error);
      console.error(
        "[WebPush] Detailed error info",
        JSON.stringify({
          endpoint: subscription.endpoint,
          errorMessage: error?.message,
          status: error?.status,
          statusCode: error?.statusCode,
          body: error?.body,
          headers: error?.headers,
        })
      );
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.pushSubscription
          .delete({ where: { endpoint: subscription.endpoint } })
          .catch(() => {});
      }
    }
  }
}

async function isUserActivelyViewing(userId: number, dietId: number) {
  const presence = await prisma.conversationPresence.findFirst({
    where: {
      userId,
      dietId,
      isActive: true,
      lastActiveAt: {
        gte: new Date(Date.now() - ACTIVE_THRESHOLD_MS),
      },
    },
  });

  return Boolean(presence);
}

/** GET /api/clients/[id]/diets/[dietId]/messages — conversation history (owner client/dietitian). */
export const GET = route<undefined, Params>({
  auth: "any",
  scope: "clients.diet.messages.list",
  handler: async ({ request, params, auth, log }) => {
  try {
    const clientId = parseInt(params.id, 10);
    const dietId = parseInt(params.dietId, 10);

    if (isNaN(clientId) || isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const messageIdParam = searchParams.get("messageId");

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
    const isOwnClient =
      auth.user!.role === "client" && client.userId === auth.user!.id;
    const isOwnDietitian =
      auth.user!.role === "dietitian" && client.dietitianId === auth.user!.id;

    if (!isOwnClient && !isOwnDietitian) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    if (messageIdParam) {
      const messageId = parseInt(messageIdParam);
      if (isNaN(messageId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid messageId" }, { status: 400 })
        );
      }

      const message = await prisma.dietComment.findUnique({
        where: {
          id: messageId,
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
                gte: new Date(),
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
      });

      if (!message) {
        return addCorsHeaders(
          NextResponse.json({ error: "Message not found" }, { status: 404 })
        );
      }

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          message,
        })
      );
    }

    // Get all messages for this diet
    const afterIdParam = searchParams.get("afterId");
    const afterId = afterIdParam ? parseInt(afterIdParam) : null;

    if (afterIdParam && (isNaN(afterId!) || afterId! < 0)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid afterId" }, { status: 400 })
      );
    }

    const messageWhere = {
      dietId,
      ...(afterId
        ? {
            id: {
              gt: afterId,
            },
          }
        : {}),
    };

    const messages = await prisma.dietComment.findMany({
      where: messageWhere,
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
    const unreadCount =
      afterId != null
        ? undefined
        : messages.filter(
      (msg) => !msg.isRead && msg.userId !== auth.user!.id
    ).length;

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        messages,
        ...(unreadCount !== undefined ? { unreadCount } : {}),
      })
    );
  } catch (err) {
    log.error("list failed", err instanceof Error ? err.message : err);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    );
  }
  },
});

/** POST /api/clients/[id]/diets/[dietId]/messages — send a message (clients may attach photos). */
export const POST = route<undefined, Params>({
  auth: "any",
  scope: "clients.diet.messages.create",
  handler: async ({ request, params, auth, log }) => {
  try {
    const clientId = parseInt(params.id, 10);
    const dietId = parseInt(params.dietId, 10);

    if (isNaN(clientId) || isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      );
    }

    const body = await request.json();
    const { content, ogunId, photos } = body;

    if (!content || content.trim() === "") {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Message content required" },
          { status: 400 }
        )
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
    const isOwnClient =
      auth.user!.role === "client" && client.userId === auth.user!.id;
    const isOwnDietitian =
      auth.user!.role === "dietitian" && client.dietitianId === auth.user!.id;

    if (!isOwnClient && !isOwnDietitian) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    // Only clients can send photos
    if (photos && photos.length > 0 && auth.user!.role !== "client") {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Only clients can send photos" },
          { status: 403 }
        )
      );
    }

    console.log(
      `💬 Creating message from ${auth.user!.role} (${auth.user!.email})`
    );

    const storedPhotos =
      photos && photos.length > 0 && auth.user!.role === "client"
        ? await Promise.all(
            photos.map(async (photo: any) => ({
              imageData: await storeMealPhotoImage(photo.imageData, {
                clientId,
                dietId,
              }),
            }))
          )
        : [];

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
      if (storedPhotos.length > 0 && auth.user!.role === "client") {
        const photoData = storedPhotos.map((photo) => ({
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

        console.log(
          `📸 Created ${createResult.count} photos for message ${message.id}`
        );
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
        console.log(
          `📤 Client (${client.name} ${client.surname}) sent message, notifying dietitian...`
        );

        if (client.dietitianId) {
          const dietitian = await prisma.user.findUnique({
            where: { id: client.dietitianId },
            select: {
              id: true,
              email: true,
              pushSubscriptions: {
                select: {
                  endpoint: true,
                  auth: true,
                  p256dh: true,
                },
              },
            },
          });

          const dietitianActive = await isUserActivelyViewing(
            client.dietitianId,
            dietId
          );

          const webPushUrl = `/clients/${clientId}/messages?dietId=${dietId}`;
          if (!dietitianActive) {
          await notifyWebSubscribers(dietitian?.pushSubscriptions || [], {
            title: `Yeni Mesaj: ${client.name} ${client.surname}`,
            body: result!.content.substring(0, 120),
            url: webPushUrl,
            data: {
              type: "new_message",
              messageId: result!.id,
              dietId,
              clientId,
              senderRole: "client",
            },
          });
          } else {
            console.log("ℹ️ Dietitian active in conversation, skipping web push.");
          }
        } else {
          console.log(
            `⚠️ Client has no assigned dietitian; skipping dietitian notifications`
          );
        }
      } else {
        // Dietitian sent message → notify client
        console.log(
          `📤 Dietitian sent message to client (${client.name} ${client.surname}), notifying...`
        );

        if (client.userId) {
          const clientUser = await prisma.user.findUnique({
            where: { id: client.userId },
            select: {
              id: true,
              email: true,
              pushSubscriptions: {
                select: {
                  endpoint: true,
                  auth: true,
                  p256dh: true,
                },
              },
            },
          });

          const clientActive = await isUserActivelyViewing(
            client.userId,
            dietId
          );

          const clientWebPushUrl = `/client/diets/${dietId}/messages`;
          if (!clientActive) {
          await notifyWebSubscribers(clientUser?.pushSubscriptions || [], {
            title: "Diyetisyeninizden Yeni Mesaj",
            body: result!.content.substring(0, 120),
            url: clientWebPushUrl,
            data: {
              type: "new_message",
              messageId: result!.id,
              dietId,
              clientId,
              senderRole: "dietitian",
            },
          });
          } else {
            console.log("ℹ️ Client active in conversation, skipping web push.");
          }
        } else {
          console.log(
            `⚠️ Client (${client.name} ${client.surname}) has no userId assigned`
          );
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
  } catch (err) {
    log.error("create failed", err instanceof Error ? err.message : err);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      )
    );
  }
  },
});

/** PATCH /api/clients/[id]/diets/[dietId]/messages — mark messages as read (owner client/dietitian). */
export const PATCH = route<undefined, Params>({
  auth: "any",
  scope: "clients.diet.messages.read",
  handler: async ({ request, params, auth, log }) => {
  try {
    const clientId = parseInt(params.id, 10);
    const dietId = parseInt(params.dietId, 10);

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
    const isOwnClient =
      auth.user!.role === "client" && client.userId === auth.user!.id;
    const isOwnDietitian =
      auth.user!.role === "dietitian" && client.dietitianId === auth.user!.id;

    if (!isOwnClient && !isOwnDietitian) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    // Mark messages as read (only if they're from the other party)
    const result = await prisma.dietComment.updateMany({
      where: {
        id: { in: messageIds },
        dietId, // Must be in this diet
        userId: { not: auth.user!.id }, // Can't mark own messages as read
        isRead: false, // Only update unread messages
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        markedCount: result.count,
      })
    );
  } catch (err) {
    log.error("read failed", err instanceof Error ? err.message : err);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to mark messages as read" },
        { status: 500 }
      )
    );
  }
  },
});
