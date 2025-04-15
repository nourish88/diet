import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/besinler - Get all besin items
export async function GET() {
  try {
    const besinler = await prisma.besin.findMany({
      include: {
        besinGroup: true, // Changed from 'group' to 'besinGroup'
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          name: "asc",
        },
      ],
    });

    return NextResponse.json(besinler);
  } catch (error) {
    console.error("Error fetching besinler:", error);
    return NextResponse.json(
      { error: "Failed to fetch besinler" },
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
      return new NextResponse(
        JSON.stringify({ error: "Geçerli bir besin adı gerekmektedir" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if group exists if groupId is provided
    if (data.groupId) {
      const group = await prisma.besinGroup.findUnique({
        where: { id: data.groupId },
      });

      if (!group) {
        return new NextResponse(
          JSON.stringify({ error: "Belirtilen besin grubu bulunamadı" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
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
        besinGroup: true,
      },
    });

    return new NextResponse(JSON.stringify(besin), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    // Avoid using console.error with the error object directly
    console.error(
      "Error creating besin: " + (error.message || "Unknown error")
    );
    return new NextResponse(
      JSON.stringify({ error: "Besin oluşturulurken bir hata oluştu" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
