import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticateRequest, getSupabaseTokenFromRequest, verifySupabaseAccessToken } from "@/lib/api-auth";
import { canReportRecovery, ClientErrorSchema, errorCodes, errorPath } from "@/lib/application-errors";
import { persistApplicationErrors, type ServerErrorInput } from "@/lib/application-error-server";
import { buildPushDeviceInfo } from "@/lib/push-device-server";
import { retrySourceSelect } from "@/lib/notification-log-snapshot";
import { getLoggingEnabled } from "@/lib/logging-settings";
import { loginIssueFromPath } from "@/lib/client-login-issues";
import { verifyClientLoginLogToken } from "@/lib/client-login-log-token";

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
    if (!await getLoggingEnabled(prisma, "application_error_logging_enabled")) return NextResponse.json({ ok: true });
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
    const events: ServerErrorInput[] = [];
    const recoveries: Array<{ eventId: string; path: string; code: string; subject: string; recoveredAt: Date }> = [];
    const now = Date.now();
    for (const event of parsed.data.events) {
      const reportedTime = new Date(event.occurredAt);
      if (reportedTime.getTime() > now + 300000 || reportedTime.getTime() < now - 7 * 86400000) return NextResponse.json({ ok: false }, { status: 400 });
      const recoveredAt = event.recoveredAt ? new Date(event.recoveredAt) : null;
      if (recoveredAt && (recoveredAt < reportedTime || recoveredAt.getTime() > now + 300000)) return NextResponse.json({ ok: false }, { status: 400 });
      const path = errorPath(event.path);
      const loginIssue = event.code === "auth_failed" && loginIssueFromPath(path);
      const subject = !loginIssue && verified && verified.id === event.subject ? verified.id : null;
      if (recoveredAt) {
        if (!subject || !canReportRecovery(path, event.code)) continue;
        recoveries.push({ eventId: event.eventId, path, code: event.code, subject, recoveredAt });
      }
      events.push({
        eventId: event.eventId, code: event.code, path, source: "client", occurredAt: reportedTime,
        subject, status: event.status, bundlePosition: event.bundlePosition,
        referenceId: loginIssue && event.loginLogToken ? verifyClientLoginLogToken(event.loginLogToken) ?? undefined : undefined,
        device: loginIssue ? undefined : description,
      });
    }
    if (!await persistApplicationErrors(prisma, events)) return NextResponse.json({ ok: false }, { status: 503 });
    for (const { recoveredAt, ...identity } of recoveries) {
      await prisma.applicationError.updateMany({
        where: { ...identity, source: "client", recoveredAt: null },
        data: { recoveredAt },
      });
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
    if (request.nextUrl.searchParams.get("view") === "client-login") {
      const enabled = await getLoggingEnabled(prisma, "application_error_logging_enabled");
      const clients = await prisma.client.findMany({
        where: { dietitianId: auth.user.id }, select: { id: true, name: true, surname: true },
      });
      const byId = new Map(clients.map(client => [client.id, `${client.name} ${client.surname}`]));
      const incidents = await prisma.applicationError.findMany({
        where: {
          code: "auth_failed", source: "client", path: { startsWith: "/login/" },
          occurredAt: { gte: new Date(Date.now() - 86400000) },
          OR: [{ referenceId: null }, { referenceId: { in: [...byId.keys()] } }],
        },
        select: { id: true, occurredAt: true, path: true, referenceId: true },
        take: 30, orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      });
      const incidentsWithNames = incidents.flatMap(({ id, occurredAt, path, referenceId }) => {
        const issue = loginIssueFromPath(path);
        return issue ? [{ id, occurredAt, ...issue, clientName: referenceId ? byId.get(referenceId) ?? null : null }] : [];
      });
      return NextResponse.json({ enabled, incidents: incidentsWithNames }, { headers: { "Cache-Control": "no-store" } });
    }
    const filter = request.nextUrl.searchParams.get("code");
    const code = errorCodes.find((value) => value === filter);
    const page = Math.max(0, Math.min(10000, Number(request.nextUrl.searchParams.get("page")) || 0));
    const clients = await prisma.user.findMany({
      where: { OR: [{ id: auth.user.id }, { client: { dietitianId: auth.user.id } }, { assistantOfId: auth.user.id }] },
      select: { supabaseId: true },
    });
    const where = {
      ...(code ? { code } : {}),
      NOT: { code: "auth_failed", path: { startsWith: "/login/" } },
      OR: [{ subject: null }, { subject: { in: clients.map((user) => user.supabaseId) } }],
    };
    const [errors, total] = await Promise.all([
      prisma.applicationError.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: Math.floor(page) * 50,
        select: { id: true, code: true, message: true, source: true, path: true, status: true, device: true, referenceId: true, occurredAt: true, createdAt: true, recoveredAt: true } }),
      prisma.applicationError.count({ where }),
    ]);
    const ids = errors.flatMap(row => row.referenceId && row.source === "server" && row.path === "/api/cron/meal-reminders" ? [row.referenceId] : []);
    const sources = ids.length ? await prisma.notificationLog.findMany({
      where: { id: { in: ids }, client: { dietitianId: auth.user.id } },
      select: retrySourceSelect,
    }) : [];
    const byId = new Map(sources.map(source => [source.id, source]));
    const rows = errors.map(row => ({
      ...row, notification: row.referenceId && row.path === "/api/cron/meal-reminders" && row.source === "server" ? byId.get(row.referenceId) ?? null : null,
    }));
    return NextResponse.json({ errors: rows, total }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Hata kayıtları alınamadı. Yeniden deneyin." }, { status: 503 }); }
}
