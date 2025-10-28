import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        surname: true,
        phoneNumber: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get all diets for the client with mobile-optimized data
    const diets = await prisma.diet.findMany({
      where: { clientId },
      include: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform data for mobile consumption
    const mobileDiets = diets.map((diet) => ({
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
    }));

    return NextResponse.json({
      success: true,
      client,
      diets: mobileDiets,
    });
  } catch (error: any) {
    console.error("Error fetching client diets:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch client diets",
      },
      { status: 500 }
    );
  }
}

