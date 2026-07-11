import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export const GET = route({
  auth: "client",
  scope: "client.check-ins.current",
  handler: async ({ auth }) => {
    const client = await prisma.client.findUnique({
      where: { userId: auth.user!.id },
      select: { id: true },
    });
    if (!client) throw new HttpError("not_found", "Danışan kaydı bulunamadı.");

    const checkIn = await prisma.weeklyCheckIn.findFirst({
      where: { clientId: client.id, sentAt: { not: null }, isTest: false },
      orderBy: { weekStart: "desc" },
      select: {
        id: true,
        weekStart: true,
        status: true,
        submittedAt: true,
      },
    });
    return { checkIn };
  },
});
