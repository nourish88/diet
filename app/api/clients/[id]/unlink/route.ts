import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireOwnClient,
  authenticateRequest,
  AuthResult,
} from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate dietitian
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const clientId = parseInt(id);

    if (isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    // SECURITY: Check if dietitian owns this client
    const hasAccess = await requireOwnClient(clientId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    // Get client with user relation
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    if (!client.userId) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Client is not linked to any user account" },
          { status: 400 }
        )
      );
    }

    // Unlink client from user
    // Set client.userId to null
    await prisma.client.update({
      where: { id: clientId },
      data: { userId: null },
    });

    // Delete the user from Prisma and Supabase
    // This allows them to create a new account and be re-mapped
    if (client.user) {
      // Delete from Supabase using Admin API (if service role key is available)
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && client.user.supabaseId) {
        try {
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            }
          );

          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
            client.user.supabaseId
          );

          if (deleteError) {
            console.error("Error deleting Supabase user:", deleteError);
            // Continue with Prisma deletion even if Supabase deletion fails
          } else {
            console.log("✅ Supabase user deleted successfully");
          }
        } catch (supabaseError) {
          console.error("Error deleting Supabase user:", supabaseError);
          // Continue with Prisma deletion even if Supabase deletion fails
        }
      }

      // Delete from Prisma
      await prisma.user.delete({
        where: { id: client.user.id },
      });
    }

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        message: "Client unlinked successfully. User can now be re-mapped.",
      })
    );
  } catch (error: any) {
    console.error("Error unlinking client:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to unlink client" },
        { status: 500 }
      )
    );
  }
}

