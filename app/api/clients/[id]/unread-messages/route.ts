import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

type Params = { id: string };

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

/**
 * GET /api/clients/[id]/unread-messages
 * Unread message counts for a client (own client, or the owning dietitian).
 */
export const GET = route<undefined, Params>({
  auth: "any",
  scope: "clients.unread-messages",
  handler: async ({ params, auth, log }) => {
    try {
      const clientId = parseInt(params.id, 10);
      if (Number.isNaN(clientId)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid client ID" }, { status: 400 }),
        );
      }

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, userId: true, dietitianId: true },
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json({ error: "Client not found" }, { status: 404 }),
        );
      }

      const user = auth.user!;
      const isOwnClient = client.userId === user.id;
      const isOwnDietitian =
        user.role === "dietitian" && client.dietitianId === user.id;
      if (!isOwnClient && !isOwnDietitian) {
        return addCorsHeaders(
          NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        );
      }

      const diets = await prisma.diet.findMany({
        where: { clientId },
        select: {
          id: true,
          _count: {
            select: {
              comments: { where: { isRead: false, userId: { not: user.id } } },
            },
          },
        },
      });

      const totalUnread = diets.reduce((sum, diet) => sum + diet._count.comments, 0);
      const unreadByDiet = diets.reduce<Record<number, number>>((acc, diet) => {
        if (diet._count.comments > 0) acc[diet.id] = diet._count.comments;
        return acc;
      }, {});

      return addCorsHeaders(
        NextResponse.json({ success: true, totalUnread, unreadByDiet }),
      );
    } catch (err) {
      log.error("unread failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to fetch unread messages" },
          { status: 500 },
        ),
      );
    }
  },
});
