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
