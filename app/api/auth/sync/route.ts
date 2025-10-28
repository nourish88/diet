import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REF-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseId, email, role, clientId } = await request.json();

    if (!supabaseId || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: supabaseId, email, role" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId },
    });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        user: existingUser,
        message: "User already exists",
      });
    }

    // Generate reference code for clients
    let referenceCode: string | null = null;
    if (role === "client") {
      referenceCode = generateReferenceCode();
      while (await prisma.user.findUnique({ where: { referenceCode } })) {
        referenceCode = generateReferenceCode();
      }
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        supabaseId,
        email,
        role,
        referenceCode,
        isApproved: role === "dietitian", // Auto-approve dietitians
      },
    });

    // If this is a client role and clientId is provided, link the user to the client
    if (role === "client" && clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { userId: user.id },
      });
    }

    // Create default notification preferences
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        mealReminders: true,
        dietUpdates: true,
        comments: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to sync user",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabaseId = searchParams.get("supabaseId");

    if (!supabaseId) {
      return NextResponse.json(
        { error: "supabaseId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId },
      include: {
        client: true,
        notificationPreference: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch user",
      },
      { status: 500 }
    );
  }
}
