import type { Prisma, PrivacyPolicy } from "@prisma/client";
import prisma from "@/lib/prisma";
import { HttpError } from "@/lib/api/handler";
import type { AuthResult } from "@/lib/api-auth";
import { HEALTH_PROCESSING_CONSENT_TYPE } from "@/lib/kvkk-consent-config";
import { privacyV2Enabled } from "./rollout";
import { ConsentDecisionSchema } from "./schemas";
import type { z } from "zod";
import { evidenceHash, privateIpHash } from "./evidence";

type Database = Prisma.TransactionClient;

export function requirePrivacyOwner(auth: AuthResult): number {
  if (!auth.user || auth.user.role !== "dietitian" || auth.user.isAssistant || auth.authType !== "supabase") {
    throw new HttpError("forbidden", "KVKK yönetimi ve raporları yalnızca veri sorumlusunun kişisel hesabına açıktır.");
  }
  return auth.user.id;
}

export async function getPortalClient(userId: number, db: Database = prisma) {
  const client = await db.client.findUnique({ where: { userId }, select: { id: true, dietitianId: true, name: true, surname: true } });
  if (!client) throw new HttpError("not_found", "Danışan profili bulunamadı.");
  return client;
}

export function currentPolicy(dietitianId: number | null, db: Database = prisma) {
  if (!dietitianId) return Promise.resolve(null);
  return db.privacyPolicy.findFirst({ where: { dietitianId }, orderBy: { revision: "desc" } });
}

export async function privacyState(clientId: number, policy: PrivacyPolicy | null, db: Database = prisma) {
  if (!policy) return { noticeAcknowledged: false, healthConsent: null, canProcessHealth: false };
  const [notice, decision] = await Promise.all([
    db.clientConsentRecord.findFirst({ where: { clientId, policyId: policy.id, action: "notice_acknowledged" } }),
    db.clientConsentRecord.findFirst({ where: { clientId, policyId: policy.id, consentType: HEALTH_PROCESSING_CONSENT_TYPE }, orderBy: { eventSequence: "desc" } }),
  ]);
  const healthConsent = decision?.action ?? null;
  return {
    noticeAcknowledged: !!notice,
    healthConsent,
    canProcessHealth: !!notice && (policy.healthLegalBasis === "healthcare" || healthConsent === "granted"),
  };
}

/** Used before new portal health uploads/updates; erasure and rights remain accessible. */
export async function assertPortalHealthProcessing(userId: number) {
  if (!privacyV2Enabled()) return;
  const client = await getPortalClient(userId);
  const policy = await currentPolicy(client.dietitianId);
  const status = await privacyState(client.id, policy);
  if (!status.canProcessHealth) {
    throw new HttpError("forbidden", "Yeni sağlık verisi paylaşımı için KVKK ve haklarım ekranındaki güncel bilgilendirme ve tercihlerinizi tamamlayın.", { reason: "health_processing_unavailable", privacyUrl: "/client/kvkk-onay" });
  }
}

export async function recordPrivacyDecision(userId: number, body: z.infer<typeof ConsentDecisionSchema>, headers: Headers) {
  return prisma.$transaction(async (tx) => {
    const profile = await getPortalClient(userId, tx);
    // All decisions for the same person are serialized, including retries/withdrawals.
    await tx.$queryRaw`SELECT "id" FROM "Client" WHERE "id" = ${profile.id} FOR UPDATE`;
    const client = await getPortalClient(userId, tx);
    if (client.dietitianId) await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${client.dietitianId} FOR SHARE`;
    const repeated = await tx.clientConsentRecord.findUnique({ where: { clientId_requestId: { clientId: client.id, requestId: body.requestId } } });
    if (repeated) {
      if (repeated.action !== body.action || repeated.policyId !== body.policyId || repeated.documentHash !== body.documentHash) {
        throw new HttpError("conflict", "Bu işlem kimliği başka bir tercih için kullanıldı.");
      }
      return { success: true, recordId: repeated.id, replayed: true };
    }
    const policy = await currentPolicy(client.dietitianId, tx);
    const target = body.action === "withdrawn"
      ? await tx.privacyPolicy.findFirst({ where: { id: body.policyId, dietitianId: client.dietitianId ?? -1 } })
      : policy;
    if (!target || target.id !== body.policyId || target.documentHash !== body.documentHash) {
      throw new HttpError("conflict", "Metin güncellendi. Güncel metni yeniden görüntüleyin.");
    }
    if (body.action !== "notice_acknowledged" && target.healthLegalBasis !== "explicit_consent") {
      throw new HttpError("bad_request", "Bu işleme faaliyeti açık rızaya dayanmıyor.");
    }
    const state = await privacyState(client.id, target, tx);
    if (["granted", "declined"].includes(body.action) && !state.noticeAcknowledged) {
      throw new HttpError("bad_request", "Önce ayrı aydınlatma metnini okuyun ve okunduğunu kaydedin.");
    }
    if (body.action === "withdrawn" && state.healthConsent !== "granted") {
      throw new HttpError("conflict", "Geri çekilecek aktif açık rıza bulunmuyor.");
    }
    const previous = await tx.clientConsentRecord.findFirst({ where: { clientId: client.id, eventSequence: { not: null } }, orderBy: { eventSequence: "desc" } });
    const data = {
      clientId: client.id, userId, consentVersion: target.version,
      consentType: body.action === "notice_acknowledged" ? "privacy_notice" : HEALTH_PROCESSING_CONSENT_TYPE,
      acceptedAt: new Date(), channel: body.channel,
      userAgent: headers.get("user-agent")?.slice(0, 256) ?? null,
      ipHash: privateIpHash(headers), action: body.action, policyId: target.id,
      documentHash: target.documentHash, eventSequence: (previous?.eventSequence ?? 0) + 1,
      previousHash: previous?.eventHash ?? null, requestId: body.requestId,
    };
    const record = await tx.clientConsentRecord.create({ data: { ...data, eventHash: evidenceHash(data) } });
    if (body.action !== "notice_acknowledged" && target.id === policy?.id) {
      await tx.client.update({ where: { id: client.id }, data: {
        kvkkPortalConsentAt: body.action === "granted" ? data.acceptedAt : null,
        kvkkPortalConsentVersion: body.action === "granted" ? target.version : null,
      } });
    }
    return { success: true, recordId: record.id, replayed: false };
  });
}
