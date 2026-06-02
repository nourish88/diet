import prisma from "@/lib/prisma";
import { route } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

/** GET /api/pending-clients — list pending client registrations (dietitian only). */
export const GET = route({
  cors: true,
  auth: "dietitian",
  scope: "pending-clients.list",
  handler: async () => {
    return prisma.user.findMany({
      where: { role: "client", isApproved: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        supabaseId: true,
        email: true,
        referenceCode: true,
        createdAt: true,
      },
    });
  },
});
