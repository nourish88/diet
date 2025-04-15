import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: {
        id: parseInt(params.id)
      },
      include: {
        diets: {
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            createdAt: true,
            tarih: true
          }
        },
        bannedFoods: {
          include: {
            besin: true
          }
        }
      }
    });

    if (!client) {
      return new NextResponse(JSON.stringify({ error: "Client not found" }), {
        status: 404,
      });
    }

    return new NextResponse(JSON.stringify({ client }), {
      status: 200,
    });
  } catch (error: any) {
    console.error("Error fetching client:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch client" }),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);
    const data = await request.json();

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: "Invalid client ID" },
        { status: 400 }
      );
    }

    // Extract bannedBesins from the data
    const { bannedBesins, ...clientData } = data;

    // First, update the client's basic information
    const updatedClient = await prisma.client.update({
      where: {
        id: clientId,
      },
      data: {
        ...clientData,
        birthdate: clientData.birthdate ? new Date(clientData.birthdate) : null,
        // First, delete all existing banned foods
        bannedFoods: {
          deleteMany: {},
        },
      },
    });

    // Then, if there are banned foods, create them
    if (bannedBesins && bannedBesins.length > 0) {
      await prisma.bannedFood.createMany({
        data: bannedBesins.map((banned: any) => ({
          clientId: clientId,
          besinId: banned.besinId,
          reason: banned.reason || '',
        })),
      });
    }

    // Fetch the updated client with all relations
    const finalClient = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      include: {
        diets: {
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            createdAt: true,
            tarih: true
          }
        },
        bannedFoods: {
          include: {
            besin: true
          }
        }
      }
    });

    return NextResponse.json({ client: finalClient }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);
    const data = await request.json();

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: "Invalid client ID" },
        { status: 400 }
      );
    }

    const updatedClient = await prisma.client.update({
      where: {
        id: clientId,
      },
      data,
      include: {
        diets: {
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            createdAt: true,
            tarih: true
          }
        },
        bannedFoods: {
          include: {
            besin: true
          }
        }
      }
    });

    return NextResponse.json({ client: updatedClient }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: "Invalid client ID" },
        { status: 400 }
      );
    }

    await prisma.client.delete({
      where: {
        id: clientId,
      },
    });

    return NextResponse.json({ message: "Client deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete client" },
      { status: 500 }
    );
  }
}
