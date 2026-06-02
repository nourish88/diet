import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

/** GET /api/clients/my-diets — diets for the signed-in client. */
export const GET = route({
  cors: true,
  auth: "client",
  scope: "clients.my-diets",
  handler: async ({ auth }) => {
    const client = await prisma.client.findUnique({
      where: { userId: auth.user!.id },
      select: { id: true },
    });
    if (!client) {
      throw new HttpError(
        "not_found",
        "Henüz bir diyetisyen tarafından onaylanmadınız. Lütfen bekleyin.",
      );
    }

    return prisma.diet.findMany({
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
  },
});
