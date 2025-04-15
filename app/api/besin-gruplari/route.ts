import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/besin-gruplari - Get all besin groups
export async function GET() {
  try {
    const besinGroups = await prisma.besinGroup.findMany({
      include: {
        _count: {
          select: {
            besins: true,
          },
        },
      },
      orderBy: {
        description: "asc",
      },
    });

    return NextResponse.json(besinGroups);
  } catch (error) {
    console.error("Error fetching besin groups:", error);
    return NextResponse.json(
      { error: "Besin grupları yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// POST /api/besin-gruplari - Create a new besin group
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate request body
    if (!data.description || typeof data.description !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir açıklama gerekmektedir" },
        { status: 400 }
      );
    }

    // Create besin group
    const besinGroup = await prisma.besinGroup.create({
      data: {
        name: data.name, // Ensure 'name' is provided in the request body
        description: data.description,
      },
    });

    return NextResponse.json(besinGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating besin group:", error);
    return NextResponse.json(
      { error: "Besin grubu oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
