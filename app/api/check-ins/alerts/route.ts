import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const GET = route({
  auth: "dietitian",
  scope: "check-ins.alerts",
  handler: async ({ auth }) => {
    const alerts = await prisma.weeklyCheckIn.findMany({
      where: {
        dietitianId: auth.user!.id,
        status: "submitted",
        satisfaction: { lte: 2 },
        contactedAt: null,
      },
      orderBy: { submittedAt: "desc" },
      take: 20,
      select: {
        id: true,
        isTest: true,
        satisfaction: true,
        challenge: true,
        supportRequest: true,
        submittedAt: true,
        client: { select: { id: true, name: true, surname: true } },
      },
    });
    return { alerts };
  },
});
