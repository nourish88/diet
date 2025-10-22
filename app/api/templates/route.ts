import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const whereClause: any = {
      isActive: true,
    };

    if (category) {
      whereClause.category = category;
    }

    const templates = await prisma.dietTemplate.findMany({
      where: whereClause,
      include: {
        oguns: {
          include: {
            items: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Şablonlar yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, su, fizik, hedef, sonuc, oguns } =
      body;

    if (!name) {
      return NextResponse.json(
        { error: "Şablon adı zorunludur" },
        { status: 400 }
      );
    }

    const template = await prisma.dietTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category: category || null,
        su: su || null,
        fizik: fizik || null,
        hedef: hedef || null,
        sonuc: sonuc || null,
        isActive: true,
        oguns: {
          create: (oguns || []).map((ogun: any) => ({
            name: ogun.name,
            time: ogun.time,
            detail: ogun.detail || null,
            order: ogun.order || 0,
            items: {
              create: (ogun.items || []).map((item: any, idx: number) => ({
                besinName: item.besinName || item.besin,
                miktar: item.miktar || "",
                birim: item.birim || "",
                order: idx,
              })),
            },
          })),
        },
      },
      include: {
        oguns: {
          include: {
            items: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Şablon oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
