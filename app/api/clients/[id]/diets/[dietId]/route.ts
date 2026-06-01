import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

type Params = { id: string; dietId: string };

/**
 * GET /api/clients/[id]/diets/[dietId]
 * Full diet detail for the owning client or dietitian.
 */
export const GET = route<undefined, Params>({
  auth: "any",
  scope: "clients.diet.get",
  handler: async ({ params, auth, log }) => {
    try {
      const clientId = parseInt(params.id, 10);
      const dietId = parseInt(params.dietId, 10);
      if (Number.isNaN(clientId) || Number.isNaN(dietId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid ID" }, { status: 400 }),
        );
      }

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, surname: true, userId: true, dietitianId: true },
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 }),
        );
      }

      const user = auth.user!;
      const isOwnClient = user.role === "client" && client.userId === user.id;
      const isOwnDietitian =
        user.role === "dietitian" && client.dietitianId === user.id;
      if (!isOwnClient && !isOwnDietitian) {
        return addCorsHeaders(
          NextResponse.json({ error: "Access denied to this client" }, { status: 403 }),
        );
      }

      const diet = await prisma.diet.findUnique({
        where: { id: dietId, clientId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              surname: true,
              phoneNumber: true,
              birthdate: true,
            },
          },
          oguns: {
            orderBy: { order: "asc" },
            include: {
              items: {
                include: {
                  besin: { select: { id: true, name: true } },
                  birim: { select: { id: true, name: true } },
                },
              },
              comments: {
                include: { user: { select: { id: true, email: true, role: true } } },
                orderBy: { createdAt: "asc" },
              },
              mealPhotos: { orderBy: { uploadedAt: "desc" } },
            },
          },
          comments: {
            include: { user: { select: { id: true, email: true, role: true } } },
            orderBy: { createdAt: "asc" },
          },
          mealPhotos: {
            include: { ogun: { select: { id: true, name: true } } },
            orderBy: { uploadedAt: "desc" },
          },
          importantDate: {
            select: {
              id: true,
              name: true,
              message: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      if (!diet) {
        return addCorsHeaders(
          NextResponse.json({ error: "Diet not found" }, { status: 404 }),
        );
      }

      const responseDiet = {
        id: diet.id,
        createdAt: diet.createdAt,
        updatedAt: diet.updatedAt,
        tarih: diet.tarih,
        su: diet.su,
        sonuc: diet.sonuc,
        hedef: diet.hedef,
        fizik: diet.fizik,
        dietitianNote: diet.dietitianNote,
        isBirthdayCelebration: diet.isBirthdayCelebration,
        isImportantDateCelebrated: diet.isImportantDateCelebrated,
        importantDate: diet.importantDate,
        client: diet.client,
        oguns: diet.oguns.map((ogun) => ({
          id: ogun.id,
          name: ogun.name,
          time: ogun.time,
          detail: ogun.detail,
          order: ogun.order,
          items: ogun.items.map((item) => ({
            id: item.id,
            miktar: item.miktar,
            besin: item.besin,
            birim: item.birim,
          })),
          comments: ogun.comments,
          mealPhotos: ogun.mealPhotos,
        })),
        comments: diet.comments,
        mealPhotos: diet.mealPhotos,
      };

      return addCorsHeaders(
        NextResponse.json({ success: true, diet: responseDiet }),
      );
    } catch (err) {
      log.error("diet detail failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { success: false, error: "Failed to fetch diet details" },
          { status: 500 },
        ),
      );
    }
  },
});
