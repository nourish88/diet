import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/besinler - Get all besin items
export async function GET() {
  try {
    const besinler = await prisma.besin.findMany({
      include: {
        group: true,
      },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(besinler);
  } catch (error) {
    console.error("Error fetching besinler:", error);
    return NextResponse.json(
      { error: "Besinler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// POST /api/besinler - Create a new besin
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate request body
    if (!data.name || typeof data.name !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir besin adı gerekmektedir" },
        { status: 400 }
      );
    }

    // Check if group exists if groupId is provided
    if (data.groupId) {
      const group = await prisma.besinGroup.findUnique({
        where: { id: data.groupId },
      });

      if (!group) {
        return NextResponse.json(
          { error: "Belirtilen besin grubu bulunamadı" },
          { status: 400 }
        );
      }
    }

    // Create besin
    const besin = await prisma.besin.create({
      data: {
        name: data.name,
        priority: data.priority || 0,
        groupId: data.groupId || null,
      },
      include: {
        group: true,
      },
    });

    return NextResponse.json(besin, { status: 201 });
  } catch (error) {
    console.error("Error creating besin:", error);
    return NextResponse.json(
      { error: "Besin oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
