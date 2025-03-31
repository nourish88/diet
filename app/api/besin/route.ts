import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const besins = await prisma.besin.findMany({
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(besins);
  } catch (error) {
    console.error('Error fetching besins:', error);
    return NextResponse.json({ error: 'Failed to fetch besins' }, { status: 500 });
  }
}