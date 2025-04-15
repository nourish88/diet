import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Received data:", data);

    // Create diet with proper null checks and defaults
    const diet = await prisma.diet.create({
      data: {
        clientId: data.clientId,
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
      diet: diet
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

    if (clientId) {
      const diets = await prisma.diet.findMany({
        where: { clientId: Number(clientId) },
        include: {
          client: true,
          oguns: {
            include: {
              items: true,
            },
          },
        },
      });
      return NextResponse.json({ diets });
    }

    return NextResponse.json(
      { error: "Client ID is required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error fetching diets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch diets" },
      { status: 500 }
    );
  }
}
