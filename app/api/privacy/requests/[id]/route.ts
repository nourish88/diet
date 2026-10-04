import { z } from "zod";
import prisma from "@/lib/prisma";
import { route, HttpError, ok } from "@/lib/api/handler";
import { requirePrivacyOwner } from "@/lib/privacy/service";
import { requirePrivacyV2 } from "@/lib/privacy/rollout";
import { RespondPrivacyRequestSchema } from "@/lib/privacy/schemas";
import { decryptIdentity } from "@/lib/privacy/evidence";

export const dynamic = "force-dynamic";
type Params = { id: string };
export const GET = route<undefined, Params>({
  auth: "dietitian", scope: "privacy.request.verify",
  handler: async ({ auth, params }) => {
    const dietitianId = requirePrivacyOwner(auth);
    requirePrivacyV2();
    if (!z.string().uuid().safeParse(params.id).success) throw new HttpError("bad_request", "Geçersiz başvuru kimliği.");
    const request = await prisma.privacyRequest.findFirst({ where: { id: params.id, dietitianId } });
    if (!request) throw new HttpError("not_found", "Başvuru bulunamadı.");
    const identityNumber = decryptIdentity(request.identityCiphertext);
    await prisma.privacyAuditLog.create({ data: { dietitianId, actorId: dietitianId, action: "request_identity_viewed", subjectId: request.id } });
    const { identityCiphertext: _encrypted, ...result } = request;
    return ok({ request: { ...result, identityNumber } }, { headers: { "Cache-Control": "private, no-store" } });
  },
});
export const PATCH = route<typeof RespondPrivacyRequestSchema, Params>({
  auth: "dietitian", scope: "privacy.request.respond", schema: RespondPrivacyRequestSchema,
  handler: async ({ auth, params, body }) => {
    const dietitianId = requirePrivacyOwner(auth);
    requirePrivacyV2();
    if (!z.string().uuid().safeParse(params.id).success) throw new HttpError("bad_request", "Geçersiz başvuru kimliği.");
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PrivacyRequest" WHERE "id" = ${params.id} AND "dietitianId" = ${dietitianId} FOR UPDATE`;
      const request = await tx.privacyRequest.findFirst({ where: { id: params.id, dietitianId } });
      if (!request) throw new HttpError("not_found", "Başvuru bulunamadı.");
      if (request.respondedAt) throw new HttpError("conflict", "Sonuçlandırılmış başvurunun cevabı değiştirilemez.");
      const final = ["fulfilled", "rejected"].includes(body.status);
      if (body.status === "fulfilled" && !request.verifiedAt && !body.identityVerified) throw new HttpError("bad_request", "Veri açıklama veya değiştirme öncesinde kimliği doğrulayın.");
      if (body.status === "fulfilled" && request.kind === "erasure" && !body.completionReference?.trim()) throw new HttpError("bad_request", "Gerçekleşen imha işlemi, kapsamı ve üçüncü kişilere bildirim kaydının referansını belirtin.");
      const now = new Date();
      const message = body.completionReference ? `${body.message}\n\nİşlem referansı: ${body.completionReference}` : body.message;
      await tx.privacyRequestEvent.create({ data: { requestId: request.id, actorId: dietitianId, status: body.status, message } });
      await tx.privacyAuditLog.create({ data: { dietitianId, actorId: dietitianId, action: "request_status_changed", subjectId: request.id } });
      // Durable inbox notification contains no identity number or health details.
      const client = await tx.client.findUnique({ where: { id: request.clientId }, select: { name: true, surname: true } });
      await tx.broadcastMessage.create({ data: {
        dietitianId, dietitianName: "Veri sorumlusu", title: "KVKK başvurunuz hakkında cevap var",
        message: "Başvurunuzun cevabını KVKK ve haklarım ekranından görüntüleyebilirsiniz.", type: "privacy_request",
        recipients: { create: { clientId: request.clientId, clientName: `${client?.name ?? ""} ${client?.surname ?? ""}`.trim(), actionUrl: "/client/kvkk-onay", deliveryStatus: "inbox_only" } },
      } });
      return tx.privacyRequest.update({ where: { id: request.id }, data: { status: body.status,
        ...(body.identityVerified && !request.verifiedAt ? { verifiedAt: now } : {}),
        ...(final ? { respondedAt: now } : {}),
      }, select: { id: true, status: true, verifiedAt: true, respondedAt: true } });
    });
    return ok({ request: result }, { headers: { "Cache-Control": "private, no-store" } });
  },
});
