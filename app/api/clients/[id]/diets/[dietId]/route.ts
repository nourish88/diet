import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; dietId: string } }
) {
  try {
    // AUTH: Require authentication
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const clientId = parseInt(params.id);
    const dietId = parseInt(params.dietId);

    if (isNaN(clientId) || isNaN(dietId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      );
    }

    console.log("🔐 Diet detail access check:", {
      userRole: auth.user.role,
      userId: auth.user.id,
      clientId,
      dietId,
    });

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        surname: true,
        userId: true,
        dietitianId: true,
      },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    // SECURITY: Check authorization
    const isOwnClient = auth.user.role === "client" && client.userId === auth.user.id;
    const isOwnDietitian = auth.user.role === "dietitian" && client.dietitianId === auth.user.id;

    if (!isOwnClient && !isOwnDietitian) {
      console.log("🔒 Access denied to client:", {
        userRole: auth.user.role,
        userId: auth.user.id,
        clientUserId: client.userId,
        clientDietitianId: client.dietitianId,
      });
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied to this client" }, { status: 403 })
      );
    }

    // Get diet with full details
    const diet = await prisma.diet.findUnique({
      where: { 
        id: dietId,
        clientId: clientId, // Ensure diet belongs to this client
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
            phoneNumber: true,
            birthdate: true,
          },
        },
        oguns: {
          orderBy: { order: "asc" },
          include: {
            items: {
              include: {
                besin: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                birim: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
            mealPhotos: {
              orderBy: {
                uploadedAt: "desc",
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        mealPhotos: {
          include: {
            ogun: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            uploadedAt: "desc",
          },
        },
        importantDate: {
          select: {
            id: true,
            name: true,
            message: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!diet) {
      return addCorsHeaders(
        NextResponse.json({ error: "Diet not found" }, { status: 404 })
      );
    }

    console.log("✅ Diet access granted:", {
      dietId: diet.id,
      clientId: diet.clientId,
      userRole: auth.user.role,
    });

    // Transform for mobile consumption
    const mobileDiet = {
      id: diet.id,
      createdAt: diet.createdAt,
      updatedAt: diet.updatedAt,
      tarih: diet.tarih,
      su: diet.su,
      sonuc: diet.sonuc,
      hedef: diet.hedef,
      fizik: diet.fizik,
      dietitianNote: diet.dietitianNote,
      isBirthdayCelebration: diet.isBirthdayCelebration,
      isImportantDateCelebrated: diet.isImportantDateCelebrated,
      importantDate: diet.importantDate,
      client: diet.client,
      oguns: diet.oguns.map((ogun) => ({
        id: ogun.id,
        name: ogun.name,
        time: ogun.time,
        detail: ogun.detail,
        order: ogun.order,
        items: ogun.items.map((item) => ({
          id: item.id,
          miktar: item.miktar,
          besin: item.besin,
          birim: item.birim,
        })),
        comments: ogun.comments,
        mealPhotos: ogun.mealPhotos,
      })),
      comments: diet.comments,
      mealPhotos: diet.mealPhotos,
    };

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        diet: mobileDiet,
      })
    );
  } catch (error: any) {
    console.error("Error fetching diet details:", error);
    return addCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to fetch diet details",
        },
        { status: 500 }
      )
    );
  }
}

