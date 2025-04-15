import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const deletedDate = await prisma.importantDate.delete({
      where: { id },
    });

    return NextResponse.json(deletedDate);
  } catch (error) {
    console.error("Error deleting important date:", error);
    return NextResponse.json(
      { error: "Failed to delete important date" },
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
    const data = await request.json();

    if (!data.name || !data.message || !data.startDate || !data.endDate) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const updatedDate = await prisma.importantDate.update({
      where: { id },
      data: {
        name: data.name,
        message: data.message,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    return NextResponse.json(updatedDate);
  } catch (error) {
    console.error("Error updating important date:", error);
    return NextResponse.json(
      { error: "Failed to update important date" },
      { status: 500 }
    );
  }
}