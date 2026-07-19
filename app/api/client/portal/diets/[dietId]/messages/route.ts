import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

type Params = { dietId: string };

/** GET /api/client/portal/diets/[dietId]/messages — messages for the signed-in client. */
export const GET = route<undefined, Params>({
  auth: "client",
  scope: "portal.messages",
  handler: async ({ request, params, auth, log }) => {
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
          clientId: true,
          oguns: { orderBy: { order: "asc" }, select: { id: true, name: true } },
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

      const afterIdParam = request.nextUrl.searchParams.get("afterId");
      const afterId = afterIdParam ? parseInt(afterIdParam, 10) : null;
      if (afterIdParam && (afterId === null || Number.isNaN(afterId) || afterId < 0)) {
        return addCorsHeaders(
          NextResponse.json({ error: "Invalid afterId" }, { status: 400 }),
        );
      }

      const messageFilter: Prisma.DietCommentWhereInput = {
        dietId: diet.id,
        ...(afterId ? { id: { gt: afterId } } : {}),
      };

      const messages = await prisma.dietComment.findMany({
        where: messageFilter,
        include: {
          user: { select: { id: true, email: true, role: true } },
          ogun: { select: { id: true, name: true } },
          photos: {
            where: {
              OR: [
                { expiresAt: null },
                { expiresAt: { gte: new Date() } },
              ],
            },
            select: { id: true, imageData: true, uploadedAt: true, expiresAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return addCorsHeaders(
        NextResponse.json({
          success: true,
          clientId: diet.clientId,
          userId: auth.user!.id,
          messages,
          oguns: diet.oguns,
        }),
      );
    } catch (err) {
      log.error("messages failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json({ error: "Failed to load messages" }, { status: 500 }),
      );
    }
  },
});
