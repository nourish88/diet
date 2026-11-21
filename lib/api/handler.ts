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
import prisma from "../prisma";
import { scheduleApplicationError } from "../application-error-server";
import { classifyError } from "../application-errors";
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
  /** Require a current lawful basis before creating/updating portal health data. */
  privacyHealthWrite?: boolean;
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

      if (opts.privacyHealthWrite && auth.user?.role === "client") {
        const { assertPortalHealthProcessing } = await import("../privacy/service");
        await assertPortalHealthProcessing(auth.user.id);
      }

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
      const code = classifyError(err);
      const status = code === "database_connection" ? 503 : 500;
      scheduleApplicationError(prisma, { code, path: request.nextUrl.pathname, status });
      return withCors(fail("internal", "Hizmete şu anda erişilemiyor. Lütfen yeniden deneyin.", undefined, { status }), opts.cors);
    }
  };
}

async function normalizeHandlerResult(result: Response | unknown): Promise<Response> {
  if (!(result instanceof Response)) {
    return ok(result);
  }
  // File bytes and their integrity headers must not be rewritten into an envelope.
  if (result.headers.get("content-disposition")?.startsWith("attachment;")) return result;

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
