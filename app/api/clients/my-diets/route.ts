import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCorsHeaders } from "@/lib/cors";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

/** GET /api/clients/my-diets — diets for the signed-in client. */
export const GET = route({
  cors: true,
  auth: "client",
  scope: "clients.my-diets",
  handler: async ({ auth, log }) => {
    try {
      const client = await prisma.client.findUnique({
        where: { userId: auth.user!.id },
      });
      if (!client) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error:
                "Henüz bir diyetisyen tarafından onaylanmadınız. Lütfen bekleyin.",
            },
            { status: 404 },
          ),
        );
      }

      const diets = await prisma.diet.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: "desc" },
        include: {
          oguns: {
            orderBy: { order: "asc" },
            include: {
              items: {
                include: {
                  besin: { select: { id: true, name: true } },
                  birim: { select: { id: true, name: true } },
                },
              },
            },
          },
          dietitian: { select: { id: true, email: true } },
        },
      });

      return addCorsHeaders(NextResponse.json(diets));
    } catch (err) {
      log.error("my-diets failed", err instanceof Error ? err.message : err);
      return addCorsHeaders(
        NextResponse.json(
          { error: "Diyetler yüklenirken bir hata oluştu" },
          { status: 500 },
        ),
      );
    }
  },
});
