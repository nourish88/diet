import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);
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
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);
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
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);
    const searchParams = new URL(request.url).searchParams;
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
