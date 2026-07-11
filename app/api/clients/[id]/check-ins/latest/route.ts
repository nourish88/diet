import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export const GET = route<undefined, { id: string }>({
  auth: "dietitian",
  scope: "clients.check-ins.latest",
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

    const checkIn = await prisma.weeklyCheckIn.findFirst({
      where: { clientId, status: "submitted" },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        isTest: true,
        weekStart: true,
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
        resolvedAt: true,
      },
    });
    return { checkIn };
  },
});
