import prisma from "@/lib/prisma";
import { route, HttpError, ok } from "@/lib/api/handler";
import { PrivacyRequestSchema } from "@/lib/privacy/schemas";
import { decryptIdentity, encryptIdentity, requestDeadline, requestEncryptionReady } from "@/lib/privacy/evidence";
import { getPortalClient } from "@/lib/privacy/service";
import { privacyV2Enabled, requirePrivacyV2 } from "@/lib/privacy/rollout";
import { NextRequest, NextResponse } from "next/server";
import { handleCors, addCorsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";
export async function OPTIONS(request: NextRequest) {
  return handleCors(request) ?? addCorsHeaders(new NextResponse(null, { status: 204 }));
}
export const GET = route({
  auth: "client", cors: true, scope: "privacy.requests.own",
  handler: async ({ auth }) => {
    if (!privacyV2Enabled()) return ok({ requests: [], requestEncryptionReady: false, mode: "legacy" }, { headers: { "Cache-Control": "private, no-store" } });
    const client = await getPortalClient(auth.user!.id);
    await prisma.$transaction(async tx => {
      const unseen = await tx.privacyRequest.findMany({ where: { clientId: client.id, userId: auth.user!.id, respondedAt: { not: null }, responseAccessedAt: null }, select: { id: true }, take: 100 });
      for (const request of unseen) {
        const updated = await tx.privacyRequest.updateMany({ where: { id: request.id, responseAccessedAt: null }, data: { responseAccessedAt: new Date() } });
        if (updated.count) await tx.privacyRequestEvent.create({ data: { requestId: request.id, actorId: auth.user!.id, status: "response_accessed", message: "Nihai cevap, kimliği doğrulanmış danışan oturumuna portal üzerinden iletildi. Bu kayıt cevabın okunduğuna dair beyan değildir." } });
      }
    });
    const requests = await prisma.privacyRequest.findMany({
      where: { clientId: client.id, userId: auth.user!.id }, orderBy: { receivedAt: "desc" }, take: 100,
      select: { id: true, kind: true, detail: true, receivedAt: true, dueAt: true, status: true, respondedAt: true, responseAccessedAt: true,
        events: { orderBy: { createdAt: "asc" }, select: { id: true, status: true, message: true, createdAt: true } } },
    });
    return ok({ requests, requestEncryptionReady: requestEncryptionReady() }, { headers: { "Cache-Control": "private, no-store" } });
  },
});
export const POST = route({
  auth: "client", cors: true, scope: "privacy.request.create", schema: PrivacyRequestSchema,
  handler: async ({ auth, body }) => {
    requirePrivacyV2();
    const user = auth.user!;
    const client = await getPortalClient(user.id);
    if (!client.dietitianId) throw new HttpError("conflict", "Veri sorumlusu eşleştirmesi bulunamadı.");
    if (!requestEncryptionReady()) throw new HttpError("conflict", "Portal başvuru kanalı henüz yapılandırılmadı. Aydınlatma metnindeki diğer başvuru yollarını kullanabilirsiniz.");
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Client" WHERE "id" = ${client.id} FOR UPDATE`;
      const repeated = await tx.privacyRequest.findUnique({ where: { clientId_requestId: { clientId: client.id, requestId: body.requestId } } });
      if (repeated) {
        if (repeated.userId !== user.id || repeated.kind !== body.kind || repeated.fullName !== body.fullName || repeated.nationality !== body.nationality || repeated.contactAddress !== body.contactAddress || repeated.detail !== body.detail || decryptIdentity(repeated.identityCiphertext) !== body.identityNumber) {
          throw new HttpError("conflict", "Bu işlem kimliği başka bir başvuru için kullanıldı.");
        }
        return { id: repeated.id, receivedAt: repeated.receivedAt, dueAt: repeated.dueAt };
      }
      const pending = await tx.privacyRequest.count({ where: { clientId: client.id, status: { notIn: ["fulfilled", "rejected"] } } });
      if (pending >= 20) throw new HttpError("rate_limited", "Bekleyen başvurularınız için mevcut başvuru kanalını kullanın veya veri sorumlusuna doğrudan ulaşın.");
      const receivedAt = new Date();
      return tx.privacyRequest.create({
        data: { clientId: client.id, dietitianId: client.dietitianId!, userId: user.id, requestId: body.requestId,
          kind: body.kind, fullName: body.fullName, nationality: body.nationality,
          identityCiphertext: encryptIdentity(body.identityNumber), contactAddress: body.contactAddress,
          email: user.email, detail: body.detail, receivedAt, dueAt: requestDeadline(receivedAt),
          events: { create: { actorId: user.id, status: "received", message: "Başvurunuz alındı. Başvuru kimliği ve cevap süresi portalda izlenebilir." } },
        }, select: { id: true, receivedAt: true, dueAt: true },
      });
    });
    return ok({ request: result }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  },
});
