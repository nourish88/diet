import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { HttpError, ok } from "@/lib/api/handler";
import type { AuthResult } from "@/lib/api-auth";
import { KVKK_PORTAL_CONSENT_TYPE, KVKK_PORTAL_CONSENT_VERSION, consentRequired } from "@/lib/kvkk-consent-config";
import { csvCell, privateIpHash } from "./evidence";
import { reportFilters } from "./report-filters";

// Explicit selections and raw inserts use only the pre-existing schema.
export async function legacyPrivacyStatus(userId: number) {
  const client = await prisma.client.findUnique({ where: { userId }, select: { id: true, kvkkPortalConsentAt: true, kvkkPortalConsentVersion: true } });
  if (!client) throw new HttpError("not_found", "Client profile not found");
  const accepted = !consentRequired(client.kvkkPortalConsentAt, client.kvkkPortalConsentVersion);
  return ok({ mode: "legacy", policy: null, noticeAcknowledged: accepted, canProcessHealth: accepted,
    healthConsent: accepted ? "granted" : null, records: [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function recordLegacyConsent(userId: number, body: { consentVersion: string; channel?: string }, headers: Headers) {
  if (body.consentVersion !== KVKK_PORTAL_CONSENT_VERSION) throw new HttpError("bad_request", "Invalid consent version", { requiredVersion: KVKK_PORTAL_CONSENT_VERSION });
  return prisma.$transaction(async tx => {
    const client = await tx.client.findUnique({ where: { userId }, select: { id: true } });
    if (!client) throw new HttpError("not_found", "Client profile not found");
    const acceptedAt = new Date();
    const channel = body.channel === "mobile" ? "mobile" : "web";
    const userAgent = headers.get("user-agent")?.slice(0, 256) ?? null;
    const ipHash = privateIpHash(headers);
    // Prisma create would RETURN every new column and fail before migration.
    await tx.$executeRaw`INSERT INTO "ClientConsentRecord" ("clientId", "userId", "consentVersion", "consentType", "acceptedAt", "channel", "userAgent", "ipHash") VALUES (${client.id}, ${userId}, ${KVKK_PORTAL_CONSENT_VERSION}, ${KVKK_PORTAL_CONSENT_TYPE}, ${acceptedAt}, ${channel}, ${userAgent}, ${ipHash})`;
    await tx.client.update({ where: { id: client.id }, data: { kvkkPortalConsentAt: acceptedAt, kvkkPortalConsentVersion: KVKK_PORTAL_CONSENT_VERSION }, select: { id: true } });
    return { success: true, version: KVKK_PORTAL_CONSENT_VERSION };
  });
}

export async function legacyConsentReport(request: NextRequest, auth: AuthResult, clientId?: number) {
  const sp = request.nextUrl.searchParams;
  const { search, from, to, format, page, pageSize } = reportFilters(sp);
  const tokens = search.split(/\s+/).filter(Boolean);
  const where = { ...(clientId ? { clientId } : {}),
    ...((from || to) ? { acceptedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    client: { dietitianId: auth.user!.id, AND: tokens.map(token => ({ OR: [
    { name: { contains: token, mode: "insensitive" as const } }, { surname: { contains: token, mode: "insensitive" as const } },
  ] })) } };
  const records = await prisma.clientConsentRecord.findMany({ where, orderBy: { acceptedAt: "desc" }, select: {
    id: true, clientId: true, consentVersion: true, consentType: true, acceptedAt: true, channel: true, userId: true, ipHash: true, userAgent: true,
    client: { select: { name: true, surname: true } },
  } });
  const rows = records.map(({ client, ...record }) => ({ ...record, clientName: `${client.name} ${client.surname}`.trim() }));
  if (format === "csv") {
    const columns = clientId
      ? ["id", "consentVersion", "consentType", "acceptedAt", "channel", "userId", "ipHash", "userAgent"] as const
      : ["id", "clientId", "clientName", "consentType", "consentVersion", "acceptedAt", "channel", "userId", "ipHash", "userAgent"] as const;
    return new NextResponse([columns.join(","), ...rows.map(row => columns.map(key => csvCell(row[key])).join(","))].join("\n"), { headers: {
      "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${clientId ? `client-${clientId}-kvkk-consents` : "kvkk-consents"}.csv"`, "Cache-Control": "private, no-store",
    } });
  }
  if (format === "json") return new NextResponse(JSON.stringify({ mode: "legacy", records: rows, total: rows.length, note: "Eski onay kayıtları; kabul edilen metin kopyası bulunmaz." }), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=\"kvkk-consents.json\"", "Cache-Control": "private, no-store" } });
  // Old consumers still receive the complete records array unless they opt into pagination.
  const result = sp.has("page") ? rows.slice((page - 1) * pageSize, page * pageSize) : rows;
  return ok({ records: result.map(row => ({ ...row, action: "legacy_accepted", evidenceStatus: "legacy_no_document_snapshot" })), total: rows.length, page, pageSize, mode: "legacy" }, { headers: { "Cache-Control": "private, no-store" } });
}
