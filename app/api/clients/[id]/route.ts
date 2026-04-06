import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireOwnClient,
  authenticateRequest,
} from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import { normalizeClientPhoneNumber } from "@/lib/client-phone-auth";

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
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        phoneAuth: true,
      },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    return addCorsHeaders(NextResponse.json(client));
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
    const normalizedPhone = normalizeClientPhoneNumber(data.phoneNumber);

    if (isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    if (data.phoneNumber && !normalizedPhone) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error:
              "Telefon numarası geçerli değil. Türkiye için 05… veya +90…; yurtdışı için +ülke kodu ile gerçek bir numara girin.",
          },
          { status: 400 }
        )
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

    // Parse gender if it's a string
    let gender: number | null = null;
    if (clientData.gender !== null && clientData.gender !== undefined) {
      if (typeof clientData.gender === "string") {
        gender = clientData.gender === "" ? null : parseInt(clientData.gender);
      } else if (typeof clientData.gender === "number") {
        gender = clientData.gender;
      }
    }

    // First, update the client's basic information
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: {
          id: clientId,
        },
        data: {
          ...clientData,
          gender: gender,
          birthdate: clientData.birthdate ? new Date(clientData.birthdate) : null,
          // First, delete all existing banned foods
          bannedFoods: {
            deleteMany: {},
          },
        },
      });

      // Then, if there are banned foods, create them
      if (bannedBesins && bannedBesins.length > 0) {
        await tx.bannedFood.createMany({
          data: bannedBesins.map((banned: any) => ({
            clientId: clientId,
            besinId: banned.besinId,
            reason: banned.reason || "",
          })),
        });
      }

      if (normalizedPhone && data.phoneNumber) {
        await tx.clientPhoneAuth.upsert({
          where: { clientId },
          create: {
            clientId,
            phoneRaw: data.phoneNumber,
            phoneNormalized: normalizedPhone,
          },
          update: {
            phoneRaw: data.phoneNumber,
            phoneNormalized: normalizedPhone,
          },
        });
      } else {
        await tx.clientPhoneAuth.deleteMany({
          where: { clientId },
        });
      }

    });

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
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        phoneAuth: true,
      },
    });

    return addCorsHeaders(NextResponse.json(finalClient));
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
    const normalizedPhone = normalizeClientPhoneNumber(data.phoneNumber);

    if (isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    if (data.phoneNumber && !normalizedPhone) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error:
              "Telefon numarası geçerli değil. Türkiye için 05… veya +90…; yurtdışı için +ülke kodu ile gerçek bir numara girin.",
          },
          { status: 400 }
        )
      );
    }

    // SECURITY: Check if dietitian owns this client
    const hasAccess = await requireOwnClient(clientId, auth);
    if (!hasAccess) {
      return addCorsHeaders(
        NextResponse.json({ error: "Access denied" }, { status: 403 })
      );
    }

    const updatedClient = await prisma.$transaction(async (tx) => {
      const updated = await tx.client.update({
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
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          phoneAuth: true,
        },
      });

      if (Object.prototype.hasOwnProperty.call(data, "phoneNumber")) {
        if (normalizedPhone && data.phoneNumber) {
          await tx.clientPhoneAuth.upsert({
            where: { clientId },
            create: {
              clientId,
              phoneRaw: data.phoneNumber,
              phoneNormalized: normalizedPhone,
            },
            update: {
              phoneRaw: data.phoneNumber,
              phoneNormalized: normalizedPhone,
            },
          });
        } else {
          await tx.clientPhoneAuth.deleteMany({
            where: { clientId },
          });
        }
      }

      return updated;
    });

    return addCorsHeaders(NextResponse.json(updatedClient));
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
