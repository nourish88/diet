import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCachedBesinGroups, invalidate } from "@/lib/cache";

// GET /api/besin-gruplari - Get all besin groups
export async function GET() {
  try {
    const besinGroups = await getCachedBesinGroups();
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

    if (!data.description || typeof data.description !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir açıklama gerekmektedir" },
        { status: 400 }
      );
    }

    const besinGroup = await prisma.besinGroup.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });

    invalidate.besinGroups();
    return NextResponse.json(besinGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating besin group:", error);
    return NextResponse.json(
      { error: "Besin grubu oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
