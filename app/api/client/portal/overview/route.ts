import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

/** GET /api/client/portal/overview — diet summary + unread counts for the signed-in client. */
export const GET = route({
  cors: true,
  auth: "client",
  scope: "portal.overview",
  handler: async ({ auth, log }) => {
    try {
      const client = await prisma.client.findUnique({
        where: { userId: auth.user!.id },
        select: {
          id: true,
          name: true,
          surname: true,
          diets: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              tarih: true,
              createdAt: true,
              hedef: true,
              su: true,
              isBirthdayCelebration: true,
              isImportantDateCelebrated: true,
              importantDate: { select: { id: true, name: true, message: true } },
              _count: { select: { oguns: true } },
            },
          },
        },
      });

      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 }),
        );
      }

      const unreadCounts = await prisma.diet.findMany({
        where: { clientId: client.id },
        select: {
          id: true,
          _count: {
            select: {
              comments: {
                where: { isRead: false, userId: { not: auth.user!.id } },
              },
            },
          },
        },
      });

      const unreadByDiet = unreadCounts.reduce<Record<number, number>>(
        (acc, diet) => {
          if (diet._count.comments > 0) acc[diet.id] = diet._count.comments;
          return acc;
        },
        {},
      );

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          client: { id: client.id, name: client.name, surname: client.surname },
          diets: client.diets.map((diet) => ({
            id: diet.id,
            tarih: diet.tarih,
            createdAt: diet.createdAt,
            hedef: diet.hedef,
            su: diet.su,
            isBirthdayCelebration: diet.isBirthdayCelebration,
            isImportantDateCelebrated: diet.isImportantDateCelebrated,
            importantDate: diet.importantDate,
            ogunCount: diet._count.oguns,
          })),
          unreadByDiet,
        }),
      );
    } catch (err) {
      log.error("overview failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to load client overview" }, { status: 500 }),
      );
    }
  },
});
