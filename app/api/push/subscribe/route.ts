import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

interface SubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const body = (await request.json()) as {
      subscription?: SubscriptionPayload;
      userId?: number;
    };

    if (!body.subscription || !body.userId) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid payload" }, { status: 400 })
      );
    }

    if (body.userId !== auth.user.id) {
      return addCorsHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    const { endpoint, keys } = body.subscription;

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: body.userId,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: body.userId,
      },
    });

    return addCorsHeaders(
      NextResponse.json(
        { success: true, subscriptionId: subscription.id },
        { status: 200 }
      )
    );
  } catch (error: any) {
    console.error("❌ Push subscription error:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to store subscription" },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const body = (await request.json()) as {
      endpoint?: string;
    };

    if (!body.endpoint) {
      return addCorsHeaders(
        NextResponse.json({ error: "Endpoint required" }, { status: 400 })
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: body.endpoint,
        userId: auth.user.id,
      },
    });

    return addCorsHeaders(
      NextResponse.json({ success: true }, { status: 200 })
    );
  } catch (error: any) {
    console.error("❌ Push subscription delete error:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to delete subscription" },
        { status: 500 }
      )
    );
  }
}

