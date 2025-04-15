import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const besins = await prisma.besin.findMany({
      orderBy: [
        {
          priority: "desc",
        },
        {
          name: "asc",
        },
      ],
      include: {
        besinGroup: true,
      },
    });

    return NextResponse.json({ besins });
  } catch (error) {
    console.error("Error fetching besins:", error);
    return NextResponse.json(
      { error: "Failed to fetch besins" },
      { status: 500 }
    );
  }
}
