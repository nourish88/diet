import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

type Params = { id: string };

/** GET /api/clients/[id]/diets — diets for a client (owner client/dietitian). */
export const GET = route<undefined, Params>({
  cors: true,
  auth: "any",
  scope: "clients.diets.list",
  handler: async ({ params, auth }) => {
    const clientId = parseInt(params.id, 10);
    if (Number.isNaN(clientId)) {
      throw new HttpError("bad_request", "Invalid client ID");
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        surname: true,
        phoneNumber: true,
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
      throw new HttpError("forbidden", "Access denied to this client's diets");
    }

    const diets = await prisma.diet.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        tarih: true,
        su: true,
        sonuc: true,
        hedef: true,
        fizik: true,
        dietitianNote: true,
        isBirthdayCelebration: true,
        isImportantDateCelebrated: true,
        importantDate: { select: { id: true, name: true, message: true } },
        oguns: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            time: true,
            detail: true,
            order: true,
            items: {
              select: {
                id: true,
                miktar: true,
                besin: { select: { id: true, name: true } },
                birim: { select: { id: true, name: true } },
              },
            },
            comments: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                content: true,
                createdAt: true,
                user: { select: { id: true, email: true, role: true } },
              },
            },
            mealPhotos: { orderBy: { uploadedAt: "desc" } },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { id: true, email: true, role: true } },
          },
        },
        mealPhotos: {
          orderBy: { uploadedAt: "desc" },
          include: { ogun: { select: { id: true, name: true } } },
        },
      },
    });

    return { success: true, client, diets };
  },
});
