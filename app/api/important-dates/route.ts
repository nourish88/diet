import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.message || !data.startDate || !data.endDate) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Create important date
    const importantDate = await prisma.importantDate.create({
      data: {
        name: data.name,
        message: data.message,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    return NextResponse.json(importantDate, { status: 201 });
  } catch (error) {
    console.error("Error creating important date:", error);
    return NextResponse.json(
      { error: "Failed to create important date" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const importantDates = await prisma.importantDate.findMany({
      orderBy: {
        startDate: 'asc',
      },
    });

    return NextResponse.json(importantDates);
  } catch (error) {
    console.error("Error fetching important dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch important dates" },
      { status: 500 }
    );
  }
}
