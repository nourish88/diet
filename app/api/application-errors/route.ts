import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticateRequest, getSupabaseTokenFromRequest, verifySupabaseAccessToken } from "@/lib/api-auth";
import { ClientErrorSchema, errorCodes } from "@/lib/application-errors";
import { persistApplicationError } from "@/lib/application-error-server";
import { buildPushDeviceInfo } from "@/lib/push-device-server";

export const dynamic = "force-dynamic";
const Body = z.object({ events: z.array(ClientErrorSchema).min(1).max(10) }).strict();
const buckets = new Map<string, { count: number; expires: number }>();
function isSameOrigin(request: NextRequest) {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    // Next may reconstruct the internal URL with localhost behind a proxy.
    const host = request.headers.get("host") ?? request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.slice(0, -1);
    return origin.host === host && origin.protocol === `${protocol}:`;
  } catch { return false; }
}
function acceptsBatch(request: NextRequest, size: number) {
  const now = Date.now();
  for (const [key, value] of buckets) if (value.expires < now) buckets.delete(key);
  const key = createHash("sha256").update(request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").digest("hex");
  const bucket = buckets.get(key) ?? { count: 0, expires: now + 60000 };
  if (bucket.count + size > 30 || buckets.size >= 1000 && !buckets.has(key)) return false;
  bucket.count += size;
  buckets.set(key, bucket);
  return true;
}

/** Public so failed logins can be reported; accepts only fixed, sanitized diagnostics. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ ok: false }, { status: 415 });
  try {
    if (Number(request.headers.get("content-length")) > 12000) return NextResponse.json({ ok: false }, { status: 413 });
    const text = await request.text();
    if (text.length > 12000) return NextResponse.json({ ok: false }, { status: 413 });
    let json: unknown;
    try { json = JSON.parse(text); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
    const parsed = Body.safeParse(json);
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    if (!acceptsBatch(request, parsed.data.events.length)) return NextResponse.json({ ok: false }, { status: 429 });
    const token = getSupabaseTokenFromRequest(request);
    // JWT verification needs no database call; an outage must not prevent queuing login failures.
    const verified = token ? verifySupabaseAccessToken(token) : null;
    const device = buildPushDeviceInfo(request.headers.get("user-agent"));
    const description = [device.os, device.osVersion, device.browser, device.browserVersion].filter(Boolean).join(" ");
    // A fixed daily cap also limits writes across separate serverless instances.
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (!verified && await prisma.applicationError.count({ where: { source: "client", subject: null, createdAt: { gte: today } } }) >= 2000) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    for (const event of parsed.data.events) {
      const reportedTime = new Date(event.occurredAt);
      if (reportedTime.getTime() > Date.now() + 300000 || reportedTime.getTime() < Date.now() - 7 * 86400000) return NextResponse.json({ ok: false }, { status: 400 });
      const stored = await persistApplicationError(prisma, {
        ...event, source: "client", occurredAt: reportedTime,
        subject: verified && verified.id === event.subject ? verified.id : null, device: description,
      });
      if (!stored) return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.user.role !== "dietitian" || auth.user.isAssistant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const filter = request.nextUrl.searchParams.get("code");
    const code = errorCodes.find((value) => value === filter);
    const page = Math.max(0, Math.min(10000, Number(request.nextUrl.searchParams.get("page")) || 0));
    const clients = await prisma.user.findMany({
      where: { OR: [{ id: auth.user.id }, { client: { dietitianId: auth.user.id } }, { assistantOfId: auth.user.id }] },
      select: { supabaseId: true },
    });
    const where = { ...(code ? { code } : {}), OR: [{ subject: null }, { subject: { in: clients.map((user) => user.supabaseId) } }] };
    const [errors, total] = await Promise.all([
      prisma.applicationError.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: Math.floor(page) * 50,
        select: { id: true, code: true, message: true, source: true, path: true, status: true, device: true, referenceId: true, occurredAt: true, createdAt: true } }),
      prisma.applicationError.count({ where }),
    ]);
    return NextResponse.json({ errors, total }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Hata kayıtları alınamadı. Yeniden deneyin." }, { status: 503 }); }
}
