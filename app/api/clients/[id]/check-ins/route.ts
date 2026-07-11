import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export const GET = route<undefined, { id: string }>({
  auth: "dietitian",
  scope: "clients.check-ins.list",
  handler: async ({ auth, params }) => {
    const clientId = Number(params.id);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      throw new HttpError("bad_request", "Geçersiz danışan.");
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, dietitianId: auth.user!.id },
      select: { id: true },
    });
    if (!client) throw new HttpError("not_found", "Danışan bulunamadı.");

    const checkIns = await prisma.weeklyCheckIn.findMany({
      where: { clientId, status: "submitted" },
      orderBy: { submittedAt: "desc" },
      take: 52,
      select: {
        id: true,
        weekStart: true,
        isTest: true,
        adherence: true,
        hunger: true,
        energy: true,
        sleep: true,
        water: true,
        exercise: true,
        satisfaction: true,
        challenge: true,
        supportRequest: true,
        submittedAt: true,
        contactedAt: true,
      },
    });

    return { checkIns };
  },
});
