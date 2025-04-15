import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const besins = await prisma.besin.findMany({
      orderBy: {
        description: "asc",
      },
    });

    console.log("MultiBesinSelector received selectedBesins:", selectedBesins);
    console.log("safeSelectedBesins after processing:", safeSelectedBesins);

    return NextResponse.json({ besins });
  } catch (error) {
    console.error("Error fetching besins:", error);
    return NextResponse.json(
      { error: "Failed to fetch besins" },
      { status: 500 }
    );
  }
}
