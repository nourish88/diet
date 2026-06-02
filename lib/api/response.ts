import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_failed"
  | "rate_limited"
  | "bad_request"
  | "internal";

export interface ApiEnvelope<T> {
  data: T | null;
  error: { code: ApiErrorCode; message: string; details?: unknown } | null;
  meta: { ts: string };
}

const META = () => ({ ts: new Date().toISOString() });

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json<ApiEnvelope<T>>(
    { data, error: null, meta: META() },
    init,
  );
}

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation_failed: 422,
  rate_limited: 429,
  bad_request: 400,
  internal: 500,
};

export function fail(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  init?: ResponseInit,
): NextResponse<ApiEnvelope<never>> {
  const status = init?.status ?? STATUS[code];
  return NextResponse.json<ApiEnvelope<never>>(
    { data: null, error: { code, message, details }, meta: META() },
    { ...init, status },
  );
}

/** True when the body matches `{ data, error, meta }`. */
export function isApiEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  if (!("data" in o) || !("error" in o) || !("meta" in o)) return false;
  const meta = o.meta;
  return meta !== null && typeof meta === "object" && "ts" in meta;
}

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation_failed",
  429: "rate_limited",
};

export function statusToErrorCode(status: number): ApiErrorCode {
  return STATUS_TO_CODE[status] ?? "internal";
}

export function legacyErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (typeof o.error === "string") return o.error;
  if (o.error && typeof o.error === "object") {
    const nested = o.error as { message?: string };
    if (typeof nested.message === "string") return nested.message;
  }
  return fallback;
}
