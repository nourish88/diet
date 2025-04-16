import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const birims = await prisma.birim.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(birims);
  } catch (error) {
    console.error("Error fetching birims:", error);
    return NextResponse.json(
      { error: "Failed to fetch birims" },
      { status: 500 }
    );
  }
}