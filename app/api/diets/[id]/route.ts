import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireDietitian,
  AuthResult,
  requireOwnDiet,
  authenticateRequest,
} from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const dietId = parseInt(id);

    if (isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid diet ID" }, { status: 400 })
      );
    }

    // SECURITY: Check access based on role
    console.log("🔐 Access check - User:", auth.user.id, "Role:", auth.user.role, "Diet ID:", dietId);
    
    let hasAccess = false;
    if (auth.user.role === "dietitian") {
      hasAccess = await requireOwnDiet(dietId, auth);
      console.log("👨‍⚕️ Dietitian access check result:", hasAccess);
    } else if (auth.user.role === "client") {
      const requireOwnClientDiet = async (dietId: number, auth: AuthResult): Promise<boolean> => {
        if (!auth.user || auth.user.role !== "client") {
          return false;
        }
        try {
          const diet = await prisma.diet.findUnique({
            where: { id: dietId },
            select: { clientId: true, dietitianId: true },
          });
          console.log("🔍 Diet found:", diet);
          console.log("🔍 User ID:", auth.user.id, "Client ID in diet:", diet?.clientId);
          if (!diet) {
            return false;
          }
          return diet.clientId === auth.user.id;
        } catch (error) {
          console.error("Error checking client diet ownership:", error);
          return false;
        }
      };
      hasAccess = await requireOwnClientDiet(dietId, auth);
      console.log("👤 Client access check result:", hasAccess);
    }

    if (!hasAccess) {
      console.log("❌ Access denied for user:", auth.user.id, "to diet:", dietId);
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }
    
    console.log("✅ Access granted for user:", auth.user.id, "to diet:", dietId);

    const diet = await prisma.diet.findUnique({
      where: {
        id: dietId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
        oguns: {
          orderBy: {
            order: "asc",
          },
          include: {
            items: {
              include: {
                besin: true,
                birim: true,
              },
            },
          },
        },
        importantDate: {
          select: {
            id: true,
            message: true,
          },
        },
      },
    });

    if (!diet) {
      return addCorsHeaders(
        NextResponse.json({ error: "Diet not found" }, { status: 404 })
      );
    }

    // Normalize date fields to ISO strings to avoid invalid date on frontend
    const normalized = {
      ...diet,
      tarih:
        (diet as any).tarih instanceof Date
          ? ((diet as any).tarih as Date).toISOString()
          : (diet as any).tarih ?? null,
      createdAt:
        (diet as any).createdAt instanceof Date
          ? ((diet as any).createdAt as Date).toISOString()
          : (diet as any).createdAt,
      updatedAt:
        (diet as any).updatedAt instanceof Date
          ? ((diet as any).updatedAt as Date).toISOString()
          : (diet as any).updatedAt,
    };

    return addCorsHeaders(NextResponse.json(normalized));
  } catch (error) {
    console.error("Error fetching diet:", error);
    return addCorsHeaders(
      NextResponse.json({ error: "Failed to fetch diet" }, { status: 500 })
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const dietId = parseInt(id);

    if (isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid diet ID" }, { status: 400 })
      );
    }

    // SECURITY: Check if dietitian owns this diet
    const hasAccess = await requireOwnDiet(dietId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    await prisma.diet.delete({
      where: { id: dietId },
    });

    return addCorsHeaders(
      NextResponse.json({ message: "Diet deleted successfully" })
    );
  } catch (error: any) {
    console.error("Error deleting diet:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to delete diet" },
        { status: 500 }
      )
    );
  }
}
