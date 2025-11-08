import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientId = parseInt(id);
    const bannedBesins = await prisma.bannedFood.findMany({
      where: { clientId },
      include: { besin: true },
    });
    return NextResponse.json(bannedBesins);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch banned besins" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientId = parseInt(id);
    const { besinId, reason } = await request.json();

    const bannedBesin = await prisma.bannedFood.create({
      data: {
        clientId,
        besinId,
        reason,
      },
      include: { besin: true },
    });

    return NextResponse.json(bannedBesin, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add banned besin" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientId = parseInt(id);
    const searchParams = request.nextUrl.searchParams;
    const besinId = parseInt(searchParams.get("besinId") || "");

    await prisma.bannedFood.delete({
      where: {
        clientId_besinId: {
          clientId,
          besinId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove banned besin" },
      { status: 500 }
    );
  }
}
