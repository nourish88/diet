import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ZodTypeAny, z } from "zod";
import {
  authenticateRequest,
  type AuthResult,
  type AuthenticatedUser,
} from "../api-auth";
import { addCorsHeaders } from "../cors";
import { createLogger, type Logger } from "../logger";
import {
  fail,
  isApiEnvelope,
  legacyErrorMessage,
  ok,
  statusToErrorCode,
  type ApiErrorCode,
} from "./response";

type Role = "dietitian" | "client";
type AuthMode = "none" | "any" | Role | Role[];

export interface RouteContext<TBody, TParams> {
  request: NextRequest;
  body: TBody;
  params: TParams;
  auth: AuthResult;
  user: AuthenticatedUser | null;
  log: Logger;
}

export interface RouteOptions<TSchema extends ZodTypeAny | undefined, TParams> {
  auth?: AuthMode;
  /** Apply CORS headers to every response from this route. */
  cors?: boolean;
  schema?: TSchema;
  scope?: string;
  handler: (
    ctx: RouteContext<
      TSchema extends ZodTypeAny ? z.infer<TSchema> : undefined,
      TParams
    >,
  ) => Promise<Response | unknown> | Response | unknown;
}

export class HttpError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function route<TSchema extends ZodTypeAny | undefined, TParams = Record<string, string>>(
  opts: RouteOptions<TSchema, TParams>,
) {
  const log = createLogger(opts.scope ?? "api");

  return async (
    request: NextRequest,
    ctx: { params: Promise<TParams> },
  ): Promise<Response> => {
    try {
      const mode: AuthMode = opts.auth ?? "any";
      const auth =
        mode === "none"
          ? ({ user: null, apiKey: null, authType: null } as AuthResult)
          : await authenticateRequest(request);

      if (mode !== "none") {
        if (!auth.user) return withCors(fail("unauthorized", "Unauthorized"), opts.cors);
        if (mode !== "any") {
          const allowed = Array.isArray(mode) ? mode : [mode];
          if (!allowed.includes(auth.user.role)) {
            return withCors(fail("forbidden", "Forbidden"), opts.cors);
          }
        }
      }

      let body: unknown = undefined;
      if (opts.schema) {
        const raw = await safeJson(request);
        const parsed = opts.schema.safeParse(raw);
        if (!parsed.success) {
          return withCors(
            fail("validation_failed", "Validation failed", parsed.error.flatten()),
            opts.cors,
          );
        }
        body = parsed.data;
      }

      const params = (ctx?.params ? await ctx.params : ({} as TParams)) as TParams;

      const result = await opts.handler({
        request,
        body: body as never,
        params,
        auth,
        user: auth.user,
        log,
      });

      return withCors(await normalizeHandlerResult(result), opts.cors);
    } catch (err) {
      if (err instanceof HttpError) {
        return withCors(fail(err.code, err.message, err.details), opts.cors);
      }
      log.error("unhandled", err instanceof Error ? err.message : String(err));
      return withCors(fail("internal", "Internal server error"), opts.cors);
    }
  };
}

async function normalizeHandlerResult(result: Response | unknown): Promise<Response> {
  if (!(result instanceof Response)) {
    return ok(result);
  }

  const contentType = result.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return result;
  }

  let body: unknown;
  try {
    body = await result.clone().json();
  } catch {
    return result;
  }

  if (isApiEnvelope(body)) {
    return result;
  }

  if (!result.ok) {
    const message = legacyErrorMessage(body, result.statusText || "Request failed");
    return fail(statusToErrorCode(result.status), message, body, { status: result.status });
  }

  return ok(body, { status: result.status });
}

function withCors(response: Response, cors?: boolean): Response {
  if (!cors) return response;
  return addCorsHeaders(response as NextResponse);
}

async function safeJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export { ok, fail };
