import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCachedBesinler, invalidate } from "@/lib/cache";

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

    const result = await getCachedBesinler(searchQuery, page, pageSize);
    return NextResponse.json(result);
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

    if (!data.name || typeof data.name !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir besin adı gerekmektedir" },
        { status: 400 }
      );
    }

    const existingBesin = await prisma.besin.findUnique({
      where: { name: data.name.trim() },
    });

    if (existingBesin) {
      return NextResponse.json(
        { error: "Bu besin zaten mevcut", besin: existingBesin },
        { status: 409 }
      );
    }

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

    invalidate.besinler();
    return NextResponse.json(newBesin, { status: 201 });
  } catch (error: any) {
    console.error("Error creating besin:", error);

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
