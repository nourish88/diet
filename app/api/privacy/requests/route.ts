import prisma from "@/lib/prisma";
import { route, ok } from "@/lib/api/handler";
import { requirePrivacyOwner } from "@/lib/privacy/service";
import { privacyV2Enabled } from "@/lib/privacy/rollout";

export const dynamic = "force-dynamic";
export const GET = route({
  auth: "dietitian", scope: "privacy.requests.list",
  handler: async ({ auth }) => {
    const dietitianId = requirePrivacyOwner(auth);
    if (!privacyV2Enabled()) return ok({ requests: [], pendingCount: 0, overdueCount: 0, mode: "legacy" }, { headers: { "Cache-Control": "private, no-store" } });
    const [requests, pendingCount, overdueCount] = await Promise.all([
      prisma.privacyRequest.findMany({ where: { dietitianId }, orderBy: [{ respondedAt: { sort: "asc", nulls: "first" } }, { dueAt: "asc" }], take: 100,
        select: { id: true, clientId: true, kind: true, fullName: true, email: true, detail: true,
          receivedAt: true, dueAt: true, status: true, verifiedAt: true, respondedAt: true, responseAccessedAt: true,
          events: { orderBy: { createdAt: "asc" } } } }),
      prisma.privacyRequest.count({ where: { dietitianId, status: { notIn: ["fulfilled", "rejected"] } } }),
      prisma.privacyRequest.count({ where: { dietitianId, status: { notIn: ["fulfilled", "rejected"] }, dueAt: { lt: new Date() } } }),
    ]);
    return ok({ requests, pendingCount, overdueCount }, { headers: { "Cache-Control": "private, no-store" } });
  },
});
