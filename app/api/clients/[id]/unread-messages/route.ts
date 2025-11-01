import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

// Handle CORS preflight
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

/**
 * GET /api/clients/[id]/unread-messages
 * 
 * Returns unread message counts for a client
 * - Total unread messages
 * - Unread messages per diet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("📧 Unread messages request for client:", params.id);

    // AUTH: Require authentication (same as other endpoints)
    const auth = await authenticateRequest(request);
    console.log("🔐 Auth result:", { 
      authenticated: !!auth.user, 
      userId: auth.user?.id, 
      role: auth.user?.role 
    });
    
    if (!auth.user) {
      console.log("❌ Unauthorized: No user found");
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const clientId = parseInt(params.id);
    
    if (isNaN(clientId)) {
      console.log("❌ Invalid client ID:", params.id);
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    // Get client to verify access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, userId: true, dietitianId: true },
    });

    console.log("👤 Client data:", client);

    if (!client) {
      console.log("❌ Client not found:", clientId);
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    // Check authorization:
    // - Client can view their own messages
    // - Dietitian can view their client's messages
    const isOwnClient = client.userId === auth.user.id;
    const isOwnDietitian =
      auth.user.role === "dietitian" && client.dietitianId === auth.user.id;

    console.log("🔒 Authorization check:", {
      isOwnClient,
      isOwnDietitian,
      clientUserId: client.userId,
      authUserId: auth.user.id,
      clientDietitianId: client.dietitianId,
    });

    if (!isOwnClient && !isOwnDietitian) {
      console.log("❌ Forbidden: User cannot access this client's messages");
      return addCorsHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    // Get all diets for this client with unread message counts
    const diets = await prisma.diet.findMany({
      where: { clientId },
      select: {
        id: true,
        _count: {
          select: {
            comments: {
              where: {
                isRead: false,
                // Show messages from the other party (not from the current user)
                userId: { not: auth.user.id },
              },
            },
          },
        },
      },
    });

    // Calculate total unread count
    const totalUnread = diets.reduce(
      (sum, diet) => sum + diet._count.comments,
      0
    );

    // Format response: dietId -> unread count
    const unreadByDiet = diets.reduce((acc, diet) => {
      if (diet._count.comments > 0) {
        acc[diet.id] = diet._count.comments;
      }
      return acc;
    }, {} as Record<number, number>);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        totalUnread,
        unreadByDiet,
      })
    );
  } catch (error) {
    console.error("Error fetching unread messages:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to fetch unread messages" },
        { status: 500 }
      )
    );
  }
}

