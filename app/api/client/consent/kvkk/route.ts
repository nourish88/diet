import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleCors, addCorsHeaders } from "@/lib/cors";
import { route, ok, HttpError } from "@/lib/api/handler";
import { ConsentDecisionSchema } from "@/lib/privacy/schemas";
import { currentPolicy, getPortalClient, privacyState, recordPrivacyDecision } from "@/lib/privacy/service";
import { privacyV2Enabled } from "@/lib/privacy/rollout";
import { legacyPrivacyStatus, recordLegacyConsent } from "@/lib/privacy/legacy";
import { z } from "zod";

export const dynamic = "force-dynamic";
export async function OPTIONS(request: NextRequest) {
  return handleCors(request) ?? addCorsHeaders(new NextResponse(null, { status: 204 }));
}
export const GET = route({
  cors: true, auth: "client", scope: "privacy.status",
  handler: async ({ auth }) => {
    if (!privacyV2Enabled()) return legacyPrivacyStatus(auth.user!.id);
    const client = await getPortalClient(auth.user!.id);
    const policy = await currentPolicy(client.dietitianId);
    const state = await privacyState(client.id, policy);
    const records = await prisma.clientConsentRecord.findMany({
      where: { clientId: client.id }, orderBy: { id: "desc" }, take: 100,
      select: { id: true, action: true, consentVersion: true, acceptedAt: true, policyId: true, documentHash: true, eventHash: true,
        policy: { select: { id: true, version: true, documentHash: true, document: true, healthLegalBasis: true } } },
    });
    return ok({ mode: "managed", policy, ...state, records }, { headers: { "Cache-Control": "private, no-store" } });
  },
});
export const POST = route({
  cors: true, auth: "client", scope: "privacy.decision",
  handler: async ({ auth, request }) => {
    if (!auth.user!.isApproved) throw new HttpError("forbidden", "Not approved");
    let body: unknown;
    try { body = await request.json(); } catch { throw new HttpError("bad_request", "Invalid consent request"); }
    if (!privacyV2Enabled()) {
      const parsed = z.object({ consentVersion: z.string(), channel: z.string().optional() }).safeParse(body);
      if (!parsed.success) throw new HttpError("bad_request", "Invalid consent request");
      return ok(await recordLegacyConsent(auth.user!.id, parsed.data, request.headers));
    }
    const parsed = ConsentDecisionSchema.safeParse(body);
    if (!parsed.success) throw new HttpError("validation_failed", "Güncel aydınlatma ve açık rıza tercihi gereklidir.", parsed.error.flatten());
    return ok(await recordPrivacyDecision(auth.user!.id, parsed.data, request.headers), { headers: { "Cache-Control": "private, no-store" } });
  },
});
