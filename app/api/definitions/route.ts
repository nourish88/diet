import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    const whereClause: any = {
      isActive: true,
    };

    if (type) {
      whereClause.type = type;
    }

    const definitions = await prisma.definition.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ definitions });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Tanımlamalar yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name } = body;

    if (!type || !name) {
      return NextResponse.json(
        { error: "Tip ve tanımlama metni zorunludur" },
        { status: 400 }
      );
    }

    // Validate type
    if (
      type !== "su_tuketimi" &&
      type !== "fiziksel_aktivite" &&
      type !== "egzersiz_tipi"
    ) {
      return NextResponse.json(
        { error: "Geçersiz tanımlama tipi" },
        { status: 400 }
      );
    }

    const definition = await prisma.definition.create({
      data: {
        type,
        name: name.trim(),
        isActive: true,
      },
    });

    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    console.error("Error creating definition:", error);
    return NextResponse.json(
      { error: "Tanımlama oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
