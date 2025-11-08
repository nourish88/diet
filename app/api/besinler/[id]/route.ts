import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/besinler/[id] - Get a specific besin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const besinId = Number(id);

    if (isNaN(besinId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const besin = await prisma.besin.findUnique({
      where: { id: besinId },
      include: {
        besinGroup: true,
      },
    });

    if (!besin) {
      return NextResponse.json({ error: "Besin bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(besin);
  } catch (error) {
    console.error("Error fetching besin:", error);
    return NextResponse.json(
      { error: "Besin yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// PUT /api/besinler/[id] - Update a besin
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const besinId = Number(id);

    if (isNaN(besinId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const data = await request.json();

    // Validate request body
    if (!data.name || typeof data.name !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir besin adı gerekmektedir" },
        { status: 400 }
      );
    }

    // Check if besin exists
    const existingBesin = await prisma.besin.findUnique({
      where: { id: besinId },
    });

    if (!existingBesin) {
      return NextResponse.json({ error: "Besin bulunamadı" }, { status: 404 });
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

    // Update besin
    const updatedBesin = await prisma.besin.update({
      where: { id: besinId },
      data: {
        name: data.name,
        priority:
          data.priority !== undefined ? data.priority : existingBesin.priority,
        groupId:
          data.groupId !== undefined ? data.groupId : existingBesin.groupId,
      },
      include: {
        besinGroup: true,
      },
    });

    return NextResponse.json(updatedBesin);
  } catch (error) {
    console.error("Error updating besin:", error);
    return NextResponse.json(
      { error: "Besin güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// DELETE /api/besinler/[id] - Delete a besin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const besinId = Number(id);

    if (isNaN(besinId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    // Check if besin exists
    const existingBesin = await prisma.besin.findUnique({
      where: { id: besinId },
      include: {
        menuItems: true,
      },
    });

    if (!existingBesin) {
      return NextResponse.json({ error: "Besin bulunamadı" }, { status: 404 });
    }

    // Check if besin is used in any menu items
    if (existingBesin.menuItems.length > 0) {
      return NextResponse.json(
        {
          error:
            "Bu besin bir veya daha fazla menü öğesinde kullanılıyor ve silinemiyor",
          menuItemCount: existingBesin.menuItems.length,
        },
        { status: 400 }
      );
    }

    try {
      await prisma.besin.delete({
        where: { id: besinId },
      });
    } catch (error) {
      console.error("Prisma delete error:", error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return NextResponse.json(
          {
            error:
              "Bu besin ilişkili kayıtlar nedeniyle silinemiyor. Lütfen önce ilgili kayıtları güncelleyin veya silin.",
          },
          { status: 400 }
        );
      }

      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting besin:", error);
    return NextResponse.json(
      { error: "Besin silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
