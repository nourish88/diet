import type { NextRequest } from "next/server";
import type { ZodTypeAny, z } from "zod";
import {
  authenticateRequest,
  type AuthResult,
  type AuthenticatedUser,
} from "../api-auth";
import { createLogger, type Logger } from "../logger";
import { fail, ok, type ApiErrorCode } from "./response";

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
  schema?: TSchema;
  scope?: string;
  handler: (
    ctx: RouteContext<
      TSchema extends ZodTypeAny ? z.infer<TSchema> : undefined,
      TParams
    >,
  ) => Promise<Response> | Response;
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
    ctx?: { params: Promise<TParams> | TParams },
  ): Promise<Response> => {
    try {
      const mode: AuthMode = opts.auth ?? "any";
      const auth =
        mode === "none"
          ? ({ user: null, apiKey: null, authType: null } as AuthResult)
          : await authenticateRequest(request);

      if (mode !== "none") {
        if (!auth.user) return fail("unauthorized", "Unauthorized");
        if (mode !== "any") {
          const allowed = Array.isArray(mode) ? mode : [mode];
          if (!allowed.includes(auth.user.role)) {
            return fail("forbidden", "Forbidden");
          }
        }
      }

      let body: unknown = undefined;
      if (opts.schema) {
        const raw = await safeJson(request);
        const parsed = opts.schema.safeParse(raw);
        if (!parsed.success) {
          return fail("validation_failed", "Validation failed", parsed.error.flatten());
        }
        body = parsed.data;
      }

      const params = (ctx?.params ? await ctx.params : ({} as TParams)) as TParams;

      const result = await opts.handler({
        request,
        body: body as any,
        params,
        auth,
        user: auth.user,
        log,
      });
      return result;
    } catch (err) {
      if (err instanceof HttpError) {
        return fail(err.code, err.message, err.details);
      }
      log.error("unhandled", err instanceof Error ? err.message : String(err));
      return fail("internal", "Internal server error");
    }
  };
}

async function safeJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export { ok, fail };
