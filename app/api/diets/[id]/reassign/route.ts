import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { invalidate } from "@/lib/cache";

const schema = z.object({
  clientId: z.number().int().positive().safe(),
  previousClientId: z.number().int().positive().safe(),
}).strict();

/** Move an existing program without rewriting its meals or replacing another program. */
export const PATCH = route<typeof schema, { id: string }>({
  cors: true,
  auth: "dietitian",
  scope: "diets.reassign",
  schema,
  handler: async ({ params, body, auth }) => {
    const dietId = Number(params.id);
    if (!Number.isSafeInteger(dietId) || dietId <= 0) {
      throw new HttpError("bad_request", "Geçersiz program numarası.");
    }
    if (body.clientId === body.previousClientId) {
      throw new HttpError("bad_request", "Farklı bir danışan seçin.");
    }

    try {
      const diet = await prisma.$transaction(async (tx) => {
        const current = await tx.diet.findFirst({
          where: { id: dietId, dietitianId: auth.user!.id },
          select: { clientId: true, _count: { select: { comments: true, mealPhotos: true } } },
        });
        if (!current) throw new HttpError("not_found", "Program bulunamadı.");
        if (current.clientId !== body.previousClientId) {
          throw new HttpError("conflict", "Programın danışanı değişmiş. Sayfayı yenileyip tekrar deneyin.");
        }
        const target = await tx.client.findFirst({
          where: { id: body.clientId, dietitianId: auth.user!.id },
          select: { id: true },
        });
        if (!target) throw new HttpError("forbidden", "Bu danışana program atama yetkiniz yok.");

        // Conversations and photos belong to the original client and must never
        // become visible to someone else through a changed diet ownership.
        if (current._count.comments > 0 || current._count.mealPhotos > 0) {
          throw new HttpError("conflict", "Bu programa bağlı mesaj veya öğün fotoğrafı var. Danışana özel bu kayıtlar nedeniyle program başka danışana taşınamaz.");
        }

        await tx.dietShareLink.deleteMany({ where: { dietId } });
        await tx.conversationPresence.deleteMany({ where: { dietId } });
        const updated = await tx.diet.update({
          where: { id: dietId },
          data: {
            clientId: target.id,
            isBirthdayCelebration: false,
            notifiedAt: null,
            viewCount: 0,
            downloadCount: 0,
          },
          select: { id: true, client: { select: { id: true, name: true, surname: true } } },
        });
        // Ownership changes are always auditable, even when form telemetry is off.
        await tx.dietFormLog.create({
          data: {
            sessionId: `reassign_${randomUUID()}`,
            dietitianId: auth.user!.id,
            clientId: target.id,
            dietId,
            action: "diet_reassigned",
            source: "server",
            metadata: {
              previousClientId: current.clientId,
              clientId: target.id,
              callerId: auth.user!.callerId ?? auth.user!.id,
            },
          },
        });
        return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000, maxWait: 5_000 });

      invalidate.analyticsStats(auth.user!.id);
      return diet;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new HttpError("conflict", "Program işlem sırasında değişti. Sayfayı yenileyip tekrar deneyin.");
      }
      throw error;
    }
  },
});
