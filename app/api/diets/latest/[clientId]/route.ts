import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId: clientIdParam } = await params;
    const clientId = Number(clientIdParam);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: "Invalid client ID" },
        { status: 400 }
      );
    }

    const diet = await prisma.diet.findFirst({
      where: { 
        clientId,
      },
      orderBy: { 
        createdAt: 'desc' 
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
      },
    });

    if (!diet) {
      return NextResponse.json(
        { message: "No diet found for this client" },
        { status: 404 }
      );
    }

    return NextResponse.json(diet);
  } catch (error) {
    console.error("Error in GET /api/diets/latest/[clientId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
