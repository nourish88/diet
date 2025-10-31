import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";

function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REF-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { supabaseId, email, role, clientId } = await request.json();

    if (!supabaseId || !email || !role) {
      const response = NextResponse.json(
        { error: "Missing required fields: supabaseId, email, role" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId },
    });

    if (existingUser) {
      const response = NextResponse.json({
        success: true,
        user: existingUser,
        message: "User already exists",
      });
      return addCorsHeaders(response);
    }

    // SECURITY: Prevent NEW dietitian creation through API
    // But allow updating existing dietitians (checked above)
    if (role === "dietitian") {
      const response = NextResponse.json(
        {
          error:
            "Dietitian accounts can only be created through Supabase admin panel",
          code: "DIETITIAN_CREATION_FORBIDDEN",
        },
        { status: 403 }
      );
      return addCorsHeaders(response);
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
        isApproved: false, // SECURITY: Clients need approval
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

    const response = NextResponse.json({
      success: true,
      user,
      message: "User created successfully",
    });
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error("Error syncing user:", error);
    const response = NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to sync user",
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

export async function GET(request: NextRequest) {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { searchParams } = new URL(request.url);
    const supabaseId = searchParams.get("supabaseId");

    if (!supabaseId) {
      const response = NextResponse.json(
        { error: "supabaseId is required" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId },
      include: {
        client: true,
        notificationPreference: true,
      },
    });

    if (!user) {
      const response = NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
      return addCorsHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      user,
    });
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    const response = NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch user",
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
