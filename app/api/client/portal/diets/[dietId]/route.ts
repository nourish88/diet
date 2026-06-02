import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

type Params = { dietId: string };

/** GET /api/client/portal/diets/[dietId] — diet detail for the signed-in client. */
export const GET = route<undefined, Params>({
  cors: true,
  auth: "client",
  scope: "portal.diet",
  handler: async ({ params, auth }) => {
    const dietIdNumber = parseInt(params.dietId, 10);
    if (Number.isNaN(dietIdNumber)) {
      throw new HttpError("bad_request", "Invalid diet ID");
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
      throw new HttpError("not_found", "Diet not found or access denied");
    }

    const unread = await prisma.dietComment.count({
      where: {
        dietId: diet.id,
        isRead: false,
        userId: { not: auth.user!.id },
      },
    });

    return { success: true, diet: { ...diet, unreadCount: unread } };
  },
});
