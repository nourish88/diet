import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dietId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    if (auth.user.role !== "client") {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Only clients can access this resource" },
          { status: 403 }
        )
      );
    }

    const { dietId } = await params;
    const dietIdNumber = parseInt(dietId);

    if (isNaN(dietIdNumber)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid diet ID" }, { status: 400 })
      );
    }

    const diet = await prisma.diet.findFirst({
      where: {
        id: dietIdNumber,
        client: {
          userId: auth.user.id,
        },
      },
      select: {
        id: true,
        tarih: true,
        createdAt: true,
        su: true,
        sonuc: true,
        hedef: true,
        fizik: true,
        dietitianNote: true,
        isBirthdayCelebration: true,
        isImportantDateCelebrated: true,
        importantDate: {
          select: {
            id: true,
            name: true,
            message: true,
          },
        },
        oguns: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            time: true,
            detail: true,
            items: {
              orderBy: { id: "asc" },
              select: {
                id: true,
                miktar: true,
                besin: {
                  select: { id: true, name: true },
                },
                birim: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        clientId: true,
      },
    });

    if (!diet) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Diet not found or access denied" },
          { status: 404 }
        )
      );
    }

    const unread = await prisma.dietComment.count({
      where: {
        dietId: diet.id,
        isRead: false,
        userId: { not: auth.user.id },
      },
    });

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        diet: {
          ...diet,
          unreadCount: unread,
        },
      })
    );
  } catch (error: any) {
    console.error("Error fetching client diet detail:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to load diet detail" },
        { status: 500 }
      )
    );
  }
}





