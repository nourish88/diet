import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const preset = await prisma.mealPreset.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!preset) {
      return NextResponse.json({ error: "Preset bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(preset);
  } catch (error) {
    console.error("Error fetching preset:", error);
    return NextResponse.json(
      { error: "Preset yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { name, mealType, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (mealType !== undefined) updateData.mealType = mealType || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const preset = await prisma.mealPreset.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
      },
    });

    return NextResponse.json(preset);
  } catch (error: any) {
    console.error("Error updating preset:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Preset bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Preset güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    await prisma.mealPreset.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Preset silindi" });
  } catch (error: any) {
    console.error("Error deleting preset:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Preset bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Preset silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
