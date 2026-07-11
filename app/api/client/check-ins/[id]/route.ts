import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { notifyDietitianOfDissatisfiedCheckIn } from "@/services/CheckInAlertService";

const Score = z.number().int().min(1).max(5);
const SubmitCheckIn = z.object({
  adherence: Score,
  hunger: Score,
  energy: Score,
  sleep: Score,
  water: Score,
  exercise: Score,
  satisfaction: Score,
  challenge: z.string().trim().max(1000).optional().default(""),
  supportRequest: z.string().trim().max(1000).optional().default(""),
});

async function ownedCheckIn(userId: number, id: number) {
  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!client) return null;
  return prisma.weeklyCheckIn.findFirst({
    where: { id, clientId: client.id },
    select: {
      id: true,
      weekStart: true,
      status: true,
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
    },
  });
}

export const GET = route<undefined, { id: string }>({
  auth: "client",
  scope: "client.check-ins.detail",
  handler: async ({ auth, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError("bad_request", "Geçersiz kontrol formu.");
    }
    const checkIn = await ownedCheckIn(auth.user!.id, id);
    if (!checkIn) throw new HttpError("not_found", "Kontrol formu bulunamadı.");

    await prisma.broadcastRecipient.updateMany({
      where: { weeklyCheckInId: id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { checkIn };
  },
});

export const POST = route<typeof SubmitCheckIn, { id: string }>({
  auth: "client",
  schema: SubmitCheckIn,
  scope: "client.check-ins.submit",
  handler: async ({ auth, params, body }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError("bad_request", "Geçersiz kontrol formu.");
    }
    const checkIn = await ownedCheckIn(auth.user!.id, id);
    if (!checkIn) throw new HttpError("not_found", "Kontrol formu bulunamadı.");
    if (checkIn.status === "submitted") {
      throw new HttpError("conflict", "Bu haftanın formu daha önce dolduruldu.");
    }

    const submittedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.weeklyCheckIn.update({
        where: { id },
        data: {
          ...body,
          challenge: body.challenge || null,
          supportRequest: body.supportRequest || null,
          status: "submitted",
          submittedAt,
        },
        select: { id: true, status: true, submittedAt: true, satisfaction: true },
      });
      await tx.broadcastRecipient.updateMany({
        where: { weeklyCheckInId: id },
        data: { isRead: true, readAt: submittedAt, archivedAt: submittedAt },
      });
      return result;
    });

    if (updated.satisfaction !== null && updated.satisfaction <= 2) {
      await notifyDietitianOfDissatisfiedCheckIn(updated.id).catch(() => ({
        sent: 0,
        failed: 1,
      }));
    }
    return {
      checkIn: updated,
      message: "Teşekkür ederiz. Yanıtlarınız diyetisyeninize iletildi.",
    };
  },
});
