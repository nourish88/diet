import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import {
  getSupabaseTokenFromRequest,
  verifySupabaseAccessToken,
} from "@/lib/api-auth";
import { classifyError } from "@/lib/application-errors";
import { scheduleApplicationError } from "@/lib/application-error-server";

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

    // Check if user already exists by supabaseId
    let existingUser = await prisma.user.findUnique({
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

    // Check if user exists by email (for clients who were unlinked)
    // If email exists and user has no client relationship, update the user with new supabaseId
    if (role === "client") {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
        include: { client: true },
      });

      if (existingUserByEmail) {
        // If user has no client relationship, update with new supabaseId
        if (!existingUserByEmail.client) {
          // Generate new reference code (ensure it's unique)
          let newReferenceCode = generateReferenceCode();
          while (await prisma.user.findUnique({ where: { referenceCode: newReferenceCode } })) {
            newReferenceCode = generateReferenceCode();
          }

          existingUser = await prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              supabaseId,
              isApproved: false,
              approvedAt: null,
              referenceCode: newReferenceCode,
            },
          });

          // Ensure notification preferences exist
          const existingPrefs = await prisma.notificationPreference.findUnique({
            where: { userId: existingUser.id },
          });

          if (!existingPrefs) {
            await prisma.notificationPreference.create({
              data: {
                userId: existingUser.id,
                mealReminders: true,
                dietUpdates: true,
                comments: true,
              },
            });
          }

          const response = NextResponse.json({
            success: true,
            user: existingUser,
            message: "User updated with new supabaseId",
          });
          return addCorsHeaders(response);
        } else {
          // User exists and has a client relationship - return error
          const response = NextResponse.json(
            {
              success: false,
              error: "User with this email already exists and is linked to a client",
            },
            { status: 400 }
          );
          return addCorsHeaders(response);
        }
      }
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

    // SECURITY: Assistant accounts are only minted by an authenticated dietitian
    // through /api/assistants — never via direct sync.
    if (role === "assistant") {
      const response = NextResponse.json(
        {
          error: "Assistant accounts must be created by a dietitian",
          code: "ASSISTANT_CREATION_FORBIDDEN",
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
    const code = classifyError(error);
    const status = code === "database_connection" ? 503 : 500;
    scheduleApplicationError(prisma, { code, path: "/api/auth/sync", status });
    const response = NextResponse.json(
      {
        success: false,
        error: "Hesap bilgileri şu anda kaydedilemedi. Lütfen yeniden deneyin.",
      },
      { status }
    );
    return addCorsHeaders(response);
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log("🔵 [Auth Sync GET] Request received");
  
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const token = getSupabaseTokenFromRequest(request);
    const verifiedUser = token ? verifySupabaseAccessToken(token) : null;
    if (!verifiedUser) {
      return addCorsHeaders(NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 }));
    }
    const supabaseId = verifiedUser.id;
    const requestedId = request.nextUrl.searchParams.get("supabaseId");
    if (requestedId && requestedId !== supabaseId) {
      return addCorsHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    const dbStartTime = Date.now();
    const user = await prisma.user.findUnique({
      where: { supabaseId },
      select: {
        id: true, supabaseId: true, email: true, role: true,
        isApproved: true, approvedAt: true, assistantOfId: true,
      },
    });
    const dbDuration = Date.now() - dbStartTime;
    console.log(`🔵 [Auth Sync GET] Database query completed in ${dbDuration}ms`);

    if (!user) {
      console.log("⚠️ [Auth Sync GET] User not found in database");
      const response = NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
      return addCorsHeaders(response);
    }

    console.log("✅ [Auth Sync GET] User found, returning response");
    const response = NextResponse.json({
      success: true,
      user,
    });
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error("❌ [Auth Sync GET] Error fetching user:", error);
    console.error("❌ [Auth Sync GET] Error stack:", error.stack);
    const code = classifyError(error);
    const status = code === "database_connection" ? 503 : 500;
    scheduleApplicationError(prisma, { code, path: "/api/auth/sync", status });
    const response = NextResponse.json(
      {
        success: false,
        error: "Hesap bilgilerine şu anda erişilemiyor. Lütfen yeniden deneyin.",
      },
      { status }
    );
    return addCorsHeaders(response);
  }
}
