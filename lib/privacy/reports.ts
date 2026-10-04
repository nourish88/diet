import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { HttpError, ok } from "@/lib/api/handler";
import type { AuthResult } from "@/lib/api-auth";
import { canonicalJson, csvCell, evidenceHash, fileHash } from "./evidence";
import { requirePrivacyOwner } from "./service";
import { privacyV2Enabled } from "./rollout";
import { legacyConsentReport } from "./legacy";
import { reportFilters } from "./report-filters";

/** Shared owner-only, bounded report contract for both audit pages. */
export async function consentReport(request: NextRequest, auth: AuthResult, clientId?: number) {
  if (!privacyV2Enabled()) return legacyConsentReport(request, auth, clientId);
  const dietitianId = requirePrivacyOwner(auth);
  const sp = request.nextUrl.searchParams;
  const { search, from, to, format, page, pageSize } = reportFilters(sp);
  const where: Prisma.ClientConsentRecordWhereInput = {
    ...(clientId ? { clientId } : {}),
    client: { dietitianId, AND: search.split(/\s+/).filter(Boolean).map(token => ({ OR: [
      { name: { contains: token, mode: "insensitive" } }, { surname: { contains: token, mode: "insensitive" } },
    ] })) },
    ...((from || to) ? { acceptedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  const [records, total] = await prisma.$transaction([
    prisma.clientConsentRecord.findMany({ where, orderBy: [{ acceptedAt: "desc" }, { id: "desc" }],
      take: format ? 10001 : pageSize, skip: format ? 0 : (page - 1) * pageSize,
      include: { client: { select: { name: true, surname: true } }, policy: true },
    }),
    prisma.clientConsentRecord.count({ where }),
  ], { isolationLevel: "RepeatableRead" });
  if (format && records.length > 10000) throw new HttpError("bad_request", "Rapor 10.000 kaydı aşıyor. Tarih aralığını daraltın; hiçbir kayıt kesilerek raporlanmaz.");
  const rows = records.map(({ client, policy, ...record }) => {
    const { id: _id, eventHash: _eventHash, ...evidence } = record;
    const policyValid = policy ? evidenceHash({ version: policy.version, healthLegalBasis: policy.healthLegalBasis, document: policy.document }) === policy.documentHash : false;
    return { ...record, clientName: `${client.name} ${client.surname}`.trim(),
      evidenceStatus: !record.eventHash ? "legacy_no_document_snapshot" : evidenceHash(evidence) === record.eventHash && policyValid && policy?.documentHash === record.documentHash ? "hash_verified" : "integrity_mismatch",
    };
  });
  const filters = { clientId: clientId ?? null, search, from: from?.toISOString() ?? null, to: to?.toISOString() ?? null };
  if (!format) {
    await prisma.privacyAuditLog.create({ data: { dietitianId, actorId: dietitianId, action: "consent_records_viewed", subjectId: clientId?.toString(), filters, rowCount: rows.length } });
    return ok({ records: rows, total, page, pageSize }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const reportId = randomUUID();
  const policies = [...new Map(records.filter(r => r.policy).map(r => [r.policyId, r.policy!])).values()];
  const report = { reportId, generatedAt: new Date().toISOString(), timezone: "UTC", generatedById: dietitianId,
    filters, total, records: rows, policies,
    evidenceNote: "SHA-256 özetleri bütünlük kontrolüdür; nitelikli elektronik imza veya bağımsız zaman damgası değildir. Eski kayıtlarda metin kopyası bulunmaz. Tarih filtresi zincirin bir bölümünü içerebilir; önceki özet bağı dışarıda kalan kayda işaret edebilir.",
  };
  const columns = ["id", "clientId", "clientName", "action", "consentType", "consentVersion", "acceptedAt", "channel", "userId", "policyId", "documentHash", "eventSequence", "previousHash", "eventHash", "evidenceStatus", "requestId", "ipHash", "userAgent"] as const;
  const payload = format === "json" ? canonicalJson(report) : "\uFEFF" + [
    [...columns, "reportId", "generatedAtUtc", "noticeText", "consentText"].map(csvCell).join(","),
    ...rows.map(row => {
      const document = policies.find(p => p.id === row.policyId)?.document as { noticeText?: string; consentText?: string } | undefined;
      return [...columns.map(column => row[column]), reportId, report.generatedAt, document?.noticeText, document?.consentText].map(csvCell).join(",");
    }),
  ].join("\r\n");
  const payloadHash = fileHash(payload);
  await prisma.privacyAuditLog.create({ data: { id: reportId, dietitianId, actorId: dietitianId, action: "consent_report_exported", subjectId: clientId?.toString(), format, filters, rowCount: rows.length, payloadHash } });
  return new NextResponse(payload, { headers: {
    "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="kvkk-${reportId}.${format}"`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "X-Report-Id": reportId, "X-Report-Hash": payloadHash,
  } });
}
