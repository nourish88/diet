import type { NextRequest } from "next/server";
import { serverEnv } from "../env";

const TS_SKEW_MS = 5 * 60 * 1000;

export interface CronAuthResult {
  ok: boolean;
  reason?: "missing_secret" | "bad_secret" | "stale_timestamp";
}

export function verifyCronRequest(request: NextRequest): CronAuthResult {
  const env = serverEnv();
  const expected = env.CRON_SECRET;
  if (!expected) return { ok: false, reason: "missing_secret" };

  const header = request.headers.get("authorization");
  const fromHeader = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;
  const fromQuery = new URL(request.url).searchParams.get("secret");
  const provided = fromHeader ?? fromQuery;
  if (!provided || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "bad_secret" };
  }

  const ts = request.headers.get("x-cron-ts");
  if (ts) {
    const t = Number(ts);
    if (!Number.isFinite(t) || Math.abs(Date.now() - t) > TS_SKEW_MS) {
      return { ok: false, reason: "stale_timestamp" };
    }
  }
  return { ok: true };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
