import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    const template = await prisma.dietTemplate.findUnique({
      where: { id },
      include: {
        oguns: {
          include: {
            items: {
              orderBy: {
                order: "asc",
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Şablon yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, description, category, su, fizik, hedef, sonuc, isActive } =
      body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category || null;
    if (su !== undefined) updateData.su = su || null;
    if (fizik !== undefined) updateData.fizik = fizik || null;
    if (hedef !== undefined) updateData.hedef = hedef || null;
    if (sonuc !== undefined) updateData.sonuc = sonuc || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await prisma.dietTemplate.update({
      where: { id },
      data: updateData,
      include: {
        oguns: {
          include: {
            items: true,
          },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("Error updating template:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Şablon güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    await prisma.dietTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Şablon silindi" });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Şablon silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
