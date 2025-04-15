import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const diet = await prisma.diet.findUnique({
      where: {
        id: Number(params.id),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
        oguns: {
          orderBy: {
            order: "asc",
          },
          include: {
            items: {
              include: {
                besin: true,
                birim: true,
              },
            },
          },
        },
        importantDate: {
          select: {
            id: true,
            message: true,
          },
        },
      },
    });

    if (!diet) {
      return new NextResponse(JSON.stringify({ error: "Diet not found" }), {
        status: 404,
      });
    }

    return NextResponse.json({ diet });
  } catch (error) {
    console.error("Error fetching diet:", error);
    return NextResponse.json(
      { error: "Failed to fetch diet" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dietId = Number(id);

    if (isNaN(dietId)) {
      return NextResponse.json({ error: "Invalid diet ID" }, { status: 400 });
    }

    await prisma.diet.delete({
      where: { id: dietId },
    });

    return NextResponse.json(
      { message: "Diet deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting diet:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete diet" },
      { status: 500 }
    );
  }
}
