import type { ApiEnvelope } from "./response";
import { isApiEnvelope, legacyErrorMessage } from "./response";

export interface ParsedApiError extends Error {
  status: number;
  statusText: string;
  code?: string;
  details?: unknown;
}

/**
 * Parse a fetch Response into data, supporting both envelope and legacy JSON bodies.
 */
export async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    if (!response.ok) {
      throw parseError(response, response.statusText || "Request failed");
    }
    return undefined as T;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      throw parseError(response, response.statusText || "Request failed");
    }
    return undefined as T;
  }

  if (isApiEnvelope(body)) {
    if (!response.ok || body.error) {
      const err = body.error;
      throw parseError(
        response,
        err ? err.message || err.code || "Request failed" : response.statusText,
        err ? { code: err.code, details: err.details } : undefined,
      );
    }
    return body.data as T;
  }

  if (!response.ok) {
    throw parseError(
      response,
      legacyErrorMessage(body, response.statusText || "Request failed"),
      { details: body },
    );
  }

  return body as T;
}

function parseError(
  response: Response,
  message: string,
  extras?: { code?: string; details?: unknown },
): ParsedApiError {
  const error = new Error(message) as ParsedApiError;
  error.status = response.status;
  error.statusText = response.statusText;
  if (extras?.code) error.code = extras.code;
  if (extras?.details !== undefined) error.details = extras.details;
  return error;
}

export type { ApiEnvelope };
