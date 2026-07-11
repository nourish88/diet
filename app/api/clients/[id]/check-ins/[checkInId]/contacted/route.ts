import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";

export const PATCH = route<undefined, { id: string; checkInId: string }>({
  auth: "dietitian",
  scope: "clients.check-ins.contacted",
  handler: async ({ auth, params }) => {
    const clientId = Number(params.id);
    const checkInId = Number(params.checkInId);
    if (
      !Number.isInteger(clientId) ||
      !Number.isInteger(checkInId) ||
      clientId <= 0 ||
      checkInId <= 0
    ) {
      throw new HttpError("bad_request", "Geçersiz kontrol kaydı.");
    }
    const checkIn = await prisma.weeklyCheckIn.findFirst({
      where: { id: checkInId, clientId, dietitianId: auth.user!.id },
      select: { id: true, contactedAt: true },
    });
    if (!checkIn) throw new HttpError("not_found", "Kontrol kaydı bulunamadı.");

    const contactedAt = checkIn.contactedAt ?? new Date();
    await prisma.weeklyCheckIn.update({
      where: { id: checkInId },
      data: { contactedAt },
    });
    return { contactedAt };
  },
});
