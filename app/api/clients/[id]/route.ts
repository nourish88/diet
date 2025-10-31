import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireOwnClient,
  authenticateRequest,
  requireDietitian,
  AuthResult,
} from "@/lib/api-auth";
import { addCorsHeaders, handleCors } from "@/lib/cors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const clientId = parseInt(id);

    if (isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    // SECURITY: Check if dietitian owns this client
    const hasAccess = await requireOwnClient(clientId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      include: {
        diets: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            createdAt: true,
            tarih: true,
          },
        },
        bannedFoods: {
          include: {
            besin: true,
          },
        },
      },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    return addCorsHeaders(NextResponse.json({ client }));
  } catch (error: any) {
    console.error("Error fetching client:", error);
    return addCorsHeaders(
      NextResponse.json({ error: "Failed to fetch client" }, { status: 500 })
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const clientId = parseInt(id);
    const data = await request.json();

    if (isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    // SECURITY: Check if dietitian owns this client
    const hasAccess = await requireOwnClient(clientId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
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
          reason: banned.reason || "",
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
            createdAt: "desc",
          },
          select: {
            id: true,
            createdAt: true,
            tarih: true,
          },
        },
        bannedFoods: {
          include: {
            besin: true,
          },
        },
      },
    });

    return addCorsHeaders(NextResponse.json({ client: finalClient }));
  } catch (error: any) {
    console.error("Error updating client:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to update client" },
        { status: 500 }
      )
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const clientId = parseInt(id);
    const data = await request.json();

    if (isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    // SECURITY: Check if dietitian owns this client
    const hasAccess = await requireOwnClient(clientId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
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
            createdAt: "desc",
          },
          select: {
            id: true,
            createdAt: true,
            tarih: true,
          },
        },
        bannedFoods: {
          include: {
            besin: true,
          },
        },
      },
    });

    return addCorsHeaders(NextResponse.json({ client: updatedClient }));
  } catch (error: any) {
    console.error("Error updating client:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to update client" },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user || auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id } = await params;
    const clientId = parseInt(id);

    if (isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    // SECURITY: Check if dietitian owns this client
    const hasAccess = await requireOwnClient(clientId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    await prisma.client.delete({
      where: {
        id: clientId,
      },
    });

    return addCorsHeaders(
      NextResponse.json({ message: "Client deleted successfully" })
    );
  } catch (error: any) {
    console.error("Error deleting client:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: error.message || "Failed to delete client" },
        { status: 500 }
      )
    );
  }
}
