import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

/** GET /api/client/portal/overview — diet summary + unread counts for the signed-in client. */
export const GET = route({
  cors: true,
  auth: "client",
  scope: "portal.overview",
  handler: async ({ auth }) => {
    const client = await prisma.client.findUnique({
      where: { userId: auth.user!.id },
      select: {
        id: true,
        name: true,
        surname: true,
        diets: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            tarih: true,
            createdAt: true,
            hedef: true,
            su: true,
            fizik: true,
            isBirthdayCelebration: true,
            isImportantDateCelebrated: true,
            importantDate: { select: { id: true, name: true, message: true } },
            _count: { select: { oguns: true } },
            oguns: {
              orderBy: { order: "asc" },
              select: { id: true, name: true, time: true },
            },
          },
        },
        progressEntries: {
          take: 2,
          orderBy: { date: "desc" },
          select: { id: true, date: true, weight: true, waist: true, bodyFat: true },
        },
      },
    });

    if (!client) throw new HttpError("not_found", "Client not found");

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

    return {
      success: true,
      client: { id: client.id, name: client.name, surname: client.surname },
      diets: client.diets.map((diet) => ({
        id: diet.id,
        tarih: diet.tarih,
        createdAt: diet.createdAt,
        hedef: diet.hedef,
        su: diet.su,
        fizik: diet.fizik,
        isBirthdayCelebration: diet.isBirthdayCelebration,
        isImportantDateCelebrated: diet.isImportantDateCelebrated,
        importantDate: diet.importantDate,
        ogunCount: diet._count.oguns,
        oguns: diet.oguns,
      })),
      progress: {
        latest: client.progressEntries[0] ?? null,
        previous: client.progressEntries[1] ?? null,
      },
      unreadByDiet,
    };
  },
});
