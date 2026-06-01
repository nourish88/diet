import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

type Params = { id: string };

/** GET /api/clients/[id]/diets — diets for a client (owner client/dietitian). */
export const GET = route<undefined, Params>({
  auth: "any",
  scope: "clients.diets.list",
  handler: async ({ params, auth, log }) => {
  try {
    const clientId = parseInt(params.id, 10);

    if (isNaN(clientId)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid client ID" }, { status: 400 })
      );
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        surname: true,
        phoneNumber: true,
        userId: true,
        dietitianId: true,
      },
    });

    if (!client) {
      return addCorsHeaders(
        NextResponse.json({ error: "Client not found" }, { status: 404 })
      );
    }

    // SECURITY: Check authorization
    // - Client can only access their own diets
    // - Dietitian can access their own clients' diets
    const user = auth.user!;
    const isOwnClient = user.role === "client" && client.userId === user.id;
    const isOwnDietitian =
      user.role === "dietitian" && client.dietitianId === user.id;

    if (!isOwnClient && !isOwnDietitian) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Access denied to this client's diets" },
          { status: 403 },
        ),
      );
    }

    // Projection: only fetch what the UI actually consumes.
    const diets = await prisma.diet.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        tarih: true,
        su: true,
        sonuc: true,
        hedef: true,
        fizik: true,
        dietitianNote: true,
        isBirthdayCelebration: true,
        isImportantDateCelebrated: true,
        importantDate: { select: { id: true, name: true, message: true } },
        oguns: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            time: true,
            detail: true,
            order: true,
            items: {
              select: {
                id: true,
                miktar: true,
                besin: { select: { id: true, name: true } },
                birim: { select: { id: true, name: true } },
              },
            },
            comments: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                content: true,
                createdAt: true,
                user: { select: { id: true, email: true, role: true } },
              },
            },
            mealPhotos: { orderBy: { uploadedAt: "desc" } },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { id: true, email: true, role: true } },
          },
        },
        mealPhotos: {
          orderBy: { uploadedAt: "desc" },
          include: { ogun: { select: { id: true, name: true } } },
        },
      },
    });

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        client,
        diets,
      })
    );
  } catch (err) {
    log.error("list failed", err instanceof Error ? err.message : err);
    return addCorsHeaders(
      NextResponse.json(
        { success: false, error: "Failed to fetch client diets" },
        { status: 500 }
      )
    );
  }
  },
});





