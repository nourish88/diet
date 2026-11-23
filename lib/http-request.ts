import { parseApiResponse } from "./api/parse-response";
import { observeRequestSuccess, reportClientError } from "./application-error-client";

export class RequestError extends Error {
  constructor(message: string, public code: string, public status?: number) {
    super(message);
    this.name = "RequestError";
  }
}

export function describeRequestError(error: unknown): string {
  if (error instanceof RequestError) return error.message;
  const message = error instanceof Error ? error.message : "";
  if (/load failed|failed to fetch|networkerror|network request failed|fetch failed/i.test(message)) {
    return "Sunucuya bağlantı kurulamadı. Bu geçici bir bağlantı veya hizmet erişim sorunu olabilir. Yeniden deneyin.";
  }
  return message || "İşlem tamamlanamadı. Lütfen yeniden deneyin.";
}

export interface HttpRequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  /** For endpoints that use POST to keep lookup parameters out of URLs. */
  readOnlyPost?: boolean;
  /** Disable generic reporting when the caller records a more specific error. */
  reportErrors?: boolean;
}

/** Retries are limited to reads; a failed response must never repeat a write. */
export async function requestJson<T>(
  url: string,
  options: HttpRequestOptions = {},
  parseResponse: (response: Response) => Promise<T> = parseApiResponse<T>,
): Promise<T> {
  const { timeoutMs = 20000, retries = 1, retryDelayMs = 0, readOnlyPost = false, reportErrors = true, signal, ...init } = options;
  const method = (init.method ?? "GET").toUpperCase();
  const startedAt = Date.now();
  const attempts = method === "GET" || (method === "POST" && readOnlyPost) ? retries + 1 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetch(url, { cache: "no-store", ...init, signal: controller.signal });
      const data = await parseResponse(response);
      if (data === undefined) throw new RequestError("Sunucudan geçerli bir yanıt alınamadı. Yeniden deneyin.", "invalid_response");
      observeRequestSuccess(url, method, startedAt);
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      const httpStatus = error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
      const normalized = timedOut
        ? new RequestError("Sunucu yanıtı zamanında alınamadı. Lütfen yeniden deneyin.", "timeout", 408)
        : httpStatus && httpStatus >= 500 ? new RequestError(`Sunucu isteği tamamlayamadı (HTTP ${httpStatus}). Lütfen yeniden deneyin.`, "http_error", httpStatus)
        : error instanceof TypeError ? new RequestError(describeRequestError(error), "network_error") : error;
      const status = normalized && typeof normalized === "object" && "status" in normalized ? Number(normalized.status) : undefined;
      const retryable = [502, 503, 504].includes(status ?? 0) || normalized instanceof RequestError && (
        normalized.code === "timeout" || normalized.code === "network_error"
      );
      if (!retryable || attempt === attempts - 1) {
        if (reportErrors && (!status || status >= 500 || status === 401 || status === 408)) {
          reportClientError(normalized, { path: url, method, status, ...(status === 401 ? { code: "auth_failed" as const } : {}) });
        }
        throw normalized;
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
    if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  throw new RequestError("İstek tamamlanamadı.", "unknown");
}
