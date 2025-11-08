import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { name, isActive } = body;

    if (!name && isActive === undefined) {
      return NextResponse.json(
        { error: "Güncellenecek veri bulunamadı" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const definition = await prisma.definition.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(definition);
  } catch (error: any) {
    console.error("Error updating definition:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Tanımlama bulunamadı" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Tanımlama güncellenirken bir hata oluştu" },
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

    await prisma.definition.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Tanımlama silindi" });
  } catch (error: any) {
    console.error("Error deleting definition:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Tanımlama bulunamadı" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Tanımlama silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
