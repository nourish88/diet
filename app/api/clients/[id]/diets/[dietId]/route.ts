import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

type Params = { id: string; dietId: string };

/**
 * GET /api/clients/[id]/diets/[dietId]
 * Full diet detail for the owning client or dietitian.
 */
export const GET = route<undefined, Params>({
  cors: true,
  auth: "any",
  scope: "clients.diet.get",
  handler: async ({ params, auth }) => {
    const clientId = parseInt(params.id, 10);
    const dietId = parseInt(params.dietId, 10);
    if (Number.isNaN(clientId) || Number.isNaN(dietId)) {
      throw new HttpError("bad_request", "Invalid ID");
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        surname: true,
        userId: true,
        dietitianId: true,
      },
    });
    if (!client) throw new HttpError("not_found", "Client not found");

    const user = auth.user!;
    const isOwnClient = user.role === "client" && client.userId === user.id;
    const isOwnDietitian =
      user.role === "dietitian" && client.dietitianId === user.id;
    if (!isOwnClient && !isOwnDietitian) {
      throw new HttpError("forbidden", "Access denied to this client");
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
              include: {
                user: { select: { id: true, email: true, role: true } },
              },
              orderBy: { createdAt: "asc" },
            },
            mealPhotos: { orderBy: { uploadedAt: "desc" } },
          },
        },
        comments: {
          include: {
            user: { select: { id: true, email: true, role: true } },
          },
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
    if (!diet) throw new HttpError("not_found", "Diet not found");

    return {
      success: true,
      diet: {
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
      },
    };
  },
});
