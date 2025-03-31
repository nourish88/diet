import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/besin-gruplari/[id] - Get a specific besin group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const besinGroupId = Number(id);

    if (isNaN(besinGroupId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const besinGroup = await prisma.besinGroup.findUnique({
      where: { id: besinGroupId },
      include: {
        besins: true,
      },
    });

    if (!besinGroup) {
      return NextResponse.json(
        { error: "Besin grubu bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(besinGroup);
  } catch (error) {
    console.error("Error fetching besin group:", error);
    return NextResponse.json(
      { error: "Besin grubu yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// PUT /api/besin-gruplari/[id] - Update a besin group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const besinGroupId = Number(id);

    if (isNaN(besinGroupId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const data = await request.json();

    // Validate request body
    if (!data.description || typeof data.description !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir açıklama gerekmektedir" },
        { status: 400 }
      );
    }

    // Check if besin group exists
    const existingGroup = await prisma.besinGroup.findUnique({
      where: { id: besinGroupId },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: "Besin grubu bulunamadı" },
        { status: 404 }
      );
    }

    // Update besin group
    const updatedGroup = await prisma.besinGroup.update({
      where: { id: besinGroupId },
      data: {
        description: data.description,
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating besin group:", error);
    return NextResponse.json(
      { error: "Besin grubu güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// DELETE /api/besin-gruplari/[id] - Delete a besin group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const besinGroupId = Number(id);

    if (isNaN(besinGroupId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    // Check if besin group exists
    const existingGroup = await prisma.besinGroup.findUnique({
      where: { id: besinGroupId },
      include: {
        besins: true,
      },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: "Besin grubu bulunamadı" },
        { status: 404 }
      );
    }

    // If there are besins in this group, update them to remove the group reference
    if (existingGroup.besins.length > 0) {
      await prisma.besin.updateMany({
        where: { groupId: besinGroupId },
        data: { groupId: null },
      });
    }

    // Delete besin group
    await prisma.besinGroup.delete({
      where: { id: besinGroupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting besin group:", error);
    return NextResponse.json(
      { error: "Besin grubu silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
