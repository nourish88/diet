import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";
import { addCorsHeaders, handleCors } from "@/lib/cors";
import {
  KVKK_PORTAL_CONSENT_TYPE,
  KVKK_PORTAL_CONSENT_VERSION,
} from "@/lib/kvkk-consent-config";
import { route, HttpError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

function hashIp(ip: string | null): string | null {
  if (!ip || ip.length === 0) return null;
  const first = ip.split(",")[0]?.trim() ?? ip.trim();
  return createHash("sha256").update(first).digest("hex");
}

function truncateUa(ua: string | null | undefined): string | null {
  if (!ua) return null;
  return ua.length > 256 ? ua.slice(0, 256) : ua;
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request);
  return corsResponse ?? addCorsHeaders(new NextResponse(null, { status: 204 }));
}

export const POST = route({
  cors: true,
  auth: "client",
  scope: "consent.kvkk",
  handler: async ({ request, auth }) => {
    if (!auth.user!.isApproved) {
      throw new HttpError("forbidden", "Not approved");
    }

    const client = await prisma.client.findFirst({
      where: { userId: auth.user!.id },
      select: { id: true },
    });
    if (!client) {
      throw new HttpError("not_found", "Client profile not found");
    }

    let body: { consentVersion?: string; channel?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const channel =
      body.channel === "mobile" || body.channel === "web" ? body.channel : "web";

    if (body.consentVersion !== KVKK_PORTAL_CONSENT_VERSION) {
      throw new HttpError("bad_request", "Invalid consent version", {
        requiredVersion: KVKK_PORTAL_CONSENT_VERSION,
      });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipHash = hashIp(forwarded || realIp);
    const userAgent = truncateUa(request.headers.get("user-agent"));

    await prisma.$transaction([
      prisma.clientConsentRecord.create({
        data: {
          clientId: client.id,
          userId: auth.user!.id,
          consentVersion: KVKK_PORTAL_CONSENT_VERSION,
          consentType: KVKK_PORTAL_CONSENT_TYPE,
          channel,
          userAgent,
          ipHash,
        },
      }),
      prisma.client.update({
        where: { id: client.id },
        data: {
          kvkkPortalConsentAt: new Date(),
          kvkkPortalConsentVersion: KVKK_PORTAL_CONSENT_VERSION,
        },
      }),
    ]);

    return { success: true, version: KVKK_PORTAL_CONSENT_VERSION };
  },
});
