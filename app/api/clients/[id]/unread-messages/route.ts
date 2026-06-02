import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route, HttpError } from "@/lib/api/handler";

type Params = { id: string };

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

/**
 * GET /api/clients/[id]/unread-messages
 * Unread message counts for a client (own client, or the owning dietitian).
 */
export const GET = route<undefined, Params>({
  cors: true,
  auth: "any",
  scope: "clients.unread-messages",
  handler: async ({ params, auth }) => {
    const clientId = parseInt(params.id, 10);
    if (Number.isNaN(clientId)) {
      throw new HttpError("bad_request", "Invalid client ID");
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, userId: true, dietitianId: true },
    });
    if (!client) throw new HttpError("not_found", "Client not found");

    const user = auth.user!;
    const isOwnClient = client.userId === user.id;
    const isOwnDietitian =
      user.role === "dietitian" && client.dietitianId === user.id;
    if (!isOwnClient && !isOwnDietitian) {
      throw new HttpError("forbidden", "Forbidden");
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

    const totalUnread = diets.reduce(
      (sum, diet) => sum + diet._count.comments,
      0,
    );
    const unreadByDiet = diets.reduce<Record<number, number>>((acc, diet) => {
      if (diet._count.comments > 0) acc[diet.id] = diet._count.comments;
      return acc;
    }, {});

    return { success: true, totalUnread, unreadByDiet };
  },
});
