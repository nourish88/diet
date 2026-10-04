import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { route, HttpError, ok } from "@/lib/api/handler";
import { PublishPolicySchema } from "@/lib/privacy/schemas";
import { buildPrivacyDocument, evidenceHash, requestEncryptionReady } from "@/lib/privacy/evidence";
import { requirePrivacyOwner } from "@/lib/privacy/service";
import { privacyV2Enabled } from "@/lib/privacy/rollout";

function schemaMissing(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code);
}

export const dynamic = "force-dynamic";
export const GET = route({
  auth: "dietitian", scope: "privacy.policies",
  handler: async ({ auth }) => {
    const dietitianId = requirePrivacyOwner(auth);
    try {
      const policies = await prisma.privacyPolicy.findMany({ where: { dietitianId }, orderBy: { revision: "desc" }, take: 100 });
      return ok({ policies, schemaReady: true, managedEnabled: privacyV2Enabled(), requestEncryptionReady: requestEncryptionReady() }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      // Only the preparation screen tolerates an unapplied migration. Managed
      // consent/write checks must never silently fall back on database errors.
      if (!privacyV2Enabled() && schemaMissing(error)) return ok({ policies: [], schemaReady: false, managedEnabled: false, requestEncryptionReady: false }, { headers: { "Cache-Control": "private, no-store" } });
      throw error;
    }
  },
});
export const POST = route({
  auth: "dietitian", scope: "privacy.publish", schema: PublishPolicySchema,
  handler: async ({ auth, body }) => {
    const dietitianId = requirePrivacyOwner(auth);
    const document = buildPrivacyDocument(body);
    try {
      const policy = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${dietitianId} FOR UPDATE`;
        const policy = await tx.privacyPolicy.create({ data: {
          dietitianId, publishedById: dietitianId, version: body.version,
          healthLegalBasis: body.healthLegalBasis, document: document as unknown as Prisma.InputJsonValue,
          documentHash: evidenceHash({ version: body.version, healthLegalBasis: body.healthLegalBasis, document }),
          reviewReference: body.reviewReference,
        } });
        await tx.privacyAuditLog.create({ data: { dietitianId, actorId: dietitianId, action: "policy_published", subjectId: policy.id, payloadHash: policy.documentHash } });
        return policy;
      });
      return ok({ policy }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
    } catch (e) {
      if (schemaMissing(e)) throw new HttpError("conflict", "KVKK veritabanı migration işlemini tamamladıktan sonra metin yayımlayabilirsiniz.");
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError("conflict", "Bu sürüm zaten yayımlandı. Yeni bir sürüm kodu kullanın.");
      throw e;
    }
  },
});
