import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDietitian, AuthResult } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

// GET - List pending client registrations (dietitian only)
export const GET = requireDietitian(
  async (request: NextRequest, auth: AuthResult) => {
    try {
      const pendingUsers = await prisma.user.findMany({
        where: {
          role: "client",
          isApproved: false,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          supabaseId: true,
          email: true,
          referenceCode: true,
          createdAt: true,
        },
      });

      return addCorsHeaders(NextResponse.json(pendingUsers));
    } catch (error) {
      console.error("Error fetching pending users:", error);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Bekleyen kayıtlar yüklenirken bir hata oluştu" },
          { status: 500 }
        )
      );
    }
  }
);

