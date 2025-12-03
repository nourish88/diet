import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

export async function GET(request: NextRequest) {
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

    const client = await prisma.client.findUnique({
      where: { userId: auth.user.id },
      select: {
        id: true,
        name: true,
        surname: true,
        diets: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            tarih: true,
            createdAt: true,
            hedef: true,
            su: true,
            isBirthdayCelebration: true,
            isImportantDateCelebrated: true,
            importantDate: {
              select: {
                id: true,
                name: true,
                message: true,
              },
            },
            _count: {
              select: {
                oguns: true,
              },
            },
          },
        },
      },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    const unreadCounts = await prisma.diet.findMany({
      where: { clientId: client.id },
      select: {
        id: true,
        _count: {
          select: {
            comments: {
              where: {
                isRead: false,
                userId: { not: auth.user.id },
              },
            },
          },
        },
      },
    });

    const unreadByDiet = unreadCounts.reduce<Record<number, number>>(
      (acc, diet) => {
        if (diet._count.comments > 0) {
          acc[diet.id] = diet._count.comments;
        }
        return acc;
      },
      {}
    );

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        client: {
          id: client.id,
          name: client.name,
          surname: client.surname,
        },
        diets: client.diets.map((diet) => ({
          id: diet.id,
          tarih: diet.tarih,
          createdAt: diet.createdAt,
          hedef: diet.hedef,
          su: diet.su,
          isBirthdayCelebration: diet.isBirthdayCelebration,
          isImportantDateCelebrated: diet.isImportantDateCelebrated,
          importantDate: diet.importantDate,
          ogunCount: diet._count.oguns,
        })),
        unreadByDiet,
      })
    );
  } catch (error: any) {
    console.error("Error fetching client portal overview:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to load client overview" },
        { status: 500 }
      )
    );
  }
}





