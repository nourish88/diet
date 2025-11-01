import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

// Handle CORS preflight
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

// POST - Save push token for user
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { pushToken } = await request.json();

    if (!pushToken) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Push token is required" },
          { status: 400 }
        )
      );
    }

    console.log(`💾 Saving push token for user ${auth.user.id}: ${pushToken.substring(0, 20)}...`);

    // Update user's push token
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { pushToken },
    });

    console.log(`✅ Push token saved for user ${auth.user.id}`);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: "Push token saved successfully",
      })
    );
  } catch (error: any) {
    console.error("❌ Error saving push token:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to save push token" },
        { status: 500 }
      )
    );
  }
}

// DELETE - Remove push token (on logout)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    console.log(`🗑️ Removing push token for user ${auth.user.id}`);

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { pushToken: null },
    });

    console.log(`✅ Push token removed for user ${auth.user.id}`);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: "Push token removed successfully",
      })
    );
  } catch (error: any) {
    console.error("❌ Error removing push token:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to remove push token" },
        { status: 500 }
      )
    );
  }
}

