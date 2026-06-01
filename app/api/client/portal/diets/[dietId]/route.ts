import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

type Params = { dietId: string };

/** GET /api/client/portal/diets/[dietId] — diet detail for the signed-in client. */
export const GET = route<undefined, Params>({
  auth: "client",
  scope: "portal.diet",
  handler: async ({ params, auth, log }) => {
    try {
      const dietIdNumber = parseInt(params.dietId, 10);
      if (Number.isNaN(dietIdNumber)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid diet ID" }, { status: 400 }),
        );
      }

      const diet = await prisma.diet.findFirst({
        where: { id: dietIdNumber, client: { userId: auth.user!.id } },
        select: {
          id: true,
          tarih: true,
          createdAt: true,
          su: true,
          sonuc: true,
          hedef: true,
          fizik: true,
          dietitianNote: true,
          isBirthdayCelebration: true,
          isImportantDateCelebrated: true,
          importantDate: { select: { id: true, name: true, message: true } },
          client: { select: { name: true, surname: true } },
          oguns: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              name: true,
              time: true,
              detail: true,
              items: {
                orderBy: { id: "asc" },
                select: {
                  id: true,
                  miktar: true,
                  besin: { select: { id: true, name: true } },
                  birim: { select: { id: true, name: true } },
                },
              },
            },
          },
          clientId: true,
        },
      });

      if (!diet) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "Diet not found or access denied" },
            { status: 404 },
          ),
        );
      }

      const unread = await prisma.dietComment.count({
        where: { dietId: diet.id, isRead: false, userId: { not: auth.user!.id } },
      });

      return addCorsHeaders(
        NextResponse.json({ success: true, diet: { ...diet, unreadCount: unread } }),
      );
    } catch (err) {
      log.error("diet detail failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to load diet detail" }, { status: 500 }),
      );
    }
  },
});
