import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("q")?.trim() ?? "";

    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const pageSizeParam = parseInt(
      searchParams.get("pageSize") || DEFAULT_PAGE_SIZE.toString(),
      10
    );

    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const pageSize = Number.isNaN(pageSizeParam)
      ? DEFAULT_PAGE_SIZE
      : Math.min(Math.max(pageSizeParam, 1), MAX_PAGE_SIZE);

    const skip = (page - 1) * pageSize;

    const whereClause = searchQuery
      ? {
          name: {
            contains: searchQuery,
            mode: "insensitive" as const,
          },
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.besin.findMany({
        where: whereClause,
        include: {
          besinGroup: true,
        },
        orderBy: [
          {
            priority: "asc",
          },
          {
            name: "asc",
          },
          {
            id: "asc",
          },
        ],
        skip,
        take: pageSize,
      }),
      prisma.besin.count({
        where: whereClause,
      }),
    ]);

    const hasMore = skip + items.length < total;
    const nextPage = hasMore ? page + 1 : null;

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      hasMore,
      nextPage,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Veritabanı bağlantısında bir hata oluştu" },
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
      return NextResponse.json(
        { error: "Geçerli bir besin adı gerekmektedir" },
        { status: 400 }
      );
    }

    // Check if besin already exists
    const existingBesin = await prisma.besin.findUnique({
      where: { name: data.name.trim() },
    });

    if (existingBesin) {
      return NextResponse.json(
        { error: "Bu besin zaten mevcut", besin: existingBesin },
        { status: 409 }
      );
    }

    // Check if group exists if groupId is provided
    if (data.groupId) {
      const group = await prisma.besinGroup.findUnique({
        where: { id: data.groupId },
      });

      if (!group) {
        return NextResponse.json(
          { error: "Belirtilen besin grubu bulunamadı" },
          { status: 400 }
        );
      }
    }

    // Create besin
    const newBesin = await prisma.besin.create({
      data: {
        name: data.name.trim(),
        priority: data.priority !== undefined ? data.priority : 0,
        groupId: data.groupId || null,
      },
      include: {
        besinGroup: true,
      },
    });

    return NextResponse.json(newBesin, { status: 201 });
  } catch (error: any) {
    console.error("Error creating besin:", error);

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Bu besin adı zaten kullanılıyor" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Besin oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
