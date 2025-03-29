import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const diets = await prisma.diet.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
    });

    return NextResponse.json({ diets });
  } catch (error: any) {
    console.error("Error fetching all diets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch diets" },
      { status: 500 }
    );
  }
}
