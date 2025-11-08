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
        clientId: true,
        oguns: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
          },
        },
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

    const messages = await prisma.dietComment.findMany({
      where: { dietId: diet.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        ogun: {
          select: {
            id: true,
            name: true,
          },
        },
        photos: {
          where: {
            expiresAt: {
              gte: new Date(),
            },
          },
          select: {
            id: true,
            imageData: true,
            uploadedAt: true,
            expiresAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        clientId: diet.clientId,
        userId: auth.user.id,
        messages,
        oguns: diet.oguns,
      })
    );
  } catch (error: any) {
    console.error("Error fetching client messages:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to load messages" },
        { status: 500 }
      )
    );
  }
}


