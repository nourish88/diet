import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { route, HttpError } from "@/lib/api/handler";
import { requirePrivacyOwner } from "@/lib/privacy/service";
import { requirePrivacyV2 } from "@/lib/privacy/rollout";
import { canonicalJson, fileHash } from "@/lib/privacy/evidence";

export const dynamic = "force-dynamic";
export const GET = route({
  auth: "dietitian", scope: "privacy.requests.report",
  handler: async ({ auth }) => {
    const dietitianId = requirePrivacyOwner(auth);
    requirePrivacyV2();
    const requests = await prisma.privacyRequest.findMany({ where: { dietitianId }, take: 10001, orderBy: { receivedAt: "asc" },
      select: { id: true, clientId: true, userId: true, fullName: true, kind: true, detail: true,
        receivedAt: true, dueAt: true, verifiedAt: true, respondedAt: true, responseAccessedAt: true, status: true,
        events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } } });
    if (requests.length > 10000) throw new HttpError("bad_request", "Başvuru raporu 10.000 kaydı aşıyor. Arşiv raporu için veri sorumlusunun yetkili veritabanı sürecini kullanın.");
    const reportId = randomUUID();
    const generatedAt = new Date();
    const payload = canonicalJson({ reportId, generatedAt, generatedById: dietitianId, timezone: "UTC", total: requests.length,
      pending: requests.filter(r => !r.respondedAt).length, overdue: requests.filter(r => !r.respondedAt && r.dueAt < generatedAt).length,
      requests, note: "Kimlik numarası ve tebligat adresi bu rapora dahil değildir. Cevaplar portalda elektronik olarak sunulur. Başvuru türünün gereği ayrıca fiilen yerine getirilmelidir." });
    const payloadHash = fileHash(payload);
    await prisma.privacyAuditLog.create({ data: { id: reportId, dietitianId, actorId: dietitianId, action: "privacy_requests_report_exported", format: "json", rowCount: requests.length, payloadHash } });
    return new NextResponse(payload, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="kvkk-basvurular-${reportId}.json"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Report-Id": reportId, "X-Report-Hash": payloadHash } });
  },
});
