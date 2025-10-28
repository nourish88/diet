import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Received data:", data);

    // Get client to inherit their dietitian (for backward compatibility)
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { dietitianId: true },
    });

    // Create diet with proper null checks and defaults
    const diet = await prisma.diet.create({
      data: {
        clientId: data.clientId,
        dietitianId: client?.dietitianId || null, // Auto-inherit from client
        tarih: data.tarih ? new Date(data.tarih) : null,
        su: data.su || "",
        sonuc: data.sonuc || "",
        hedef: data.hedef || "",
        fizik: data.fizik || "",
        isBirthdayCelebration: data.isBirthdayCelebration || false,
        isImportantDateCelebrated: data.isImportantDateCelebrated || false,
        importantDateId: data.importantDateId || null,
        // Remove importantDateName field
        dietitianNote: data.dietitianNote || "",
        oguns: {
          create: (data.oguns || []).map((ogun: any) => ({
            name: ogun.name || "",
            time: ogun.time || "",
            detail: ogun.detail || "",
            order: ogun.order || 0,
            items: {
              create: (ogun.items || []).map((item: any) => ({
                miktar: item.miktar || "",
                birim: {
                  connectOrCreate: {
                    where: { name: item.birim || "" },
                    create: { name: item.birim || "" },
                  },
                },
                besin: {
                  connectOrCreate: {
                    where: { name: item.besin || "" },
                    create: { name: item.besin || "" },
                  },
                },
              })),
            },
          })),
        },
      },
      include: {
        oguns: {
          include: {
            items: {
              include: {
                birim: true,
                besin: true,
              },
            },
          },
        },
        client: true,
      },
    });

    return NextResponse.json({
      success: true,
      diet: diet,
    });
  } catch (error) {
    console.error("Error creating diet:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Database error: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const dietitianId = searchParams.get("dietitianId");

    // Build where clause based on filters
    const where: any = {};
    if (clientId) {
      where.clientId = Number(clientId);
    }
    if (dietitianId) {
      where.dietitianId = Number(dietitianId);
    }

    // If no filters provided, return error
    if (!clientId && !dietitianId) {
      return NextResponse.json(
        { error: "Client ID or Dietitian ID is required" },
        { status: 400 }
      );
    }

    const diets = await prisma.diet.findMany({
      where,
      include: {
        client: true,
        oguns: {
          include: {
            items: {
              include: {
                besin: true,
                birim: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ diets });
  } catch (error: any) {
    console.error("Error fetching diets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch diets" },
      { status: 500 }
    );
  }
}
