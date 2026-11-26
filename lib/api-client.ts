import { clientGateUrl } from "./client-return-path";
import { createClient } from "./supabase-browser";
import { requestJson } from "./http-request";
import { reportClientError } from "./application-error-client";
import type { Session } from "@supabase/supabase-js";
import type { ApiEnvelope } from "./api/response";
import { isApiEnvelope, legacyErrorMessage } from "./api/response";

export { isApiEnvelope };

/**
 * API Error interface
 */
export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  endpoint?: string;
  /** Present when the server returned an {@link ApiEnvelope} error body. */
  code?: string;
  details?: unknown;
}

function envelopeErrorMessage(
  err: NonNullable<ApiEnvelope<never>["error"]>,
): string {
  return err.message || err.code || "Request failed";
}

/**
 * Request interceptor type
 * Allows modifying request config before sending
 */
export type RequestInterceptor = (
  config: RequestInit
) => Promise<RequestInit> | RequestInit;

/**
 * Response interceptor type
 * Allows modifying response or handling errors
 */
export type ResponseInterceptor = (
  response: Response
) => Promise<Response> | Response;

export interface ApiRequestInit extends RequestInit {
  timeoutMs?: number;
}

/**
 * API Client - Automatic authentication injection for web
 * Mobile app uses its own client in mobile/src/core/api/client.ts
 */
class ApiClient {
  private baseURL = "/api";
  private sessionCache: { session: Session | null; timestamp: number } | null =
    null;
  private readonly SESSION_CACHE_TTL = 60000; // 1 minute
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  /**
   * Get cached session or fetch new one if cache is expired
   */
  private async getCachedSession(): Promise<Session | null> {
    const now = Date.now();

    const cachedSession = this.sessionCache?.session;
    const cachedTokenExpiresAt = cachedSession?.expires_at
      ? cachedSession.expires_at * 1000
      : null;
    const isCachedTokenFresh =
      !cachedTokenExpiresAt || cachedTokenExpiresAt > now + 10000;

    // Return cached session if still valid and not close to expiry
    if (
      this.sessionCache?.session &&
      now - this.sessionCache.timestamp < this.SESSION_CACHE_TTL &&
      isCachedTokenFresh
    ) {
      const cacheAge = Math.round((now - this.sessionCache.timestamp) / 1000);
      console.log(`[API Client] Session cache HIT (age: ${cacheAge}s)`);
      return this.sessionCache.session;
    }

    // Fetch new session
    console.log(
      `[API Client] Session cache MISS - fetching new session${
        this.sessionCache && !isCachedTokenFresh ? " (cached token expiring)" : ""
      }`
    );
    const supabase = createClient();
    const {
      data: { session }, error,
    } = await supabase.auth.getSession();
    if (error) {
      reportClientError(error, { code: "auth_failed" });
      throw error;
    }

    // Update cache
    this.sessionCache = { session, timestamp: now };
    console.log(
      `[API Client] Session cached:`,
      session ? `user=${session.user?.email || "anonymous"}` : "null"
    );

    return session;
  }

  /**
   * Clear session cache (useful for logout or auth errors)
   */
  clearSessionCache(): void {
    console.log(`[API Client] Clearing session cache`);
    this.sessionCache = null;
  }

  /**
   * Add request interceptor
   * Interceptors are called in order before each request
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Remove request interceptor
   */
  removeRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors = this.requestInterceptors.filter(
      (i) => i !== interceptor
    );
  }

  /**
   * Add response interceptor
   * Interceptors are called in order after each response
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Remove response interceptor
   */
  removeResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors = this.responseInterceptors.filter(
      (i) => i !== interceptor
    );
  }

  /**
   * Apply all request interceptors
   */
  private async applyRequestInterceptors(
    config: RequestInit
  ): Promise<RequestInit> {
    let finalConfig = config;

    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    return finalConfig;
  }

  /**
   * Apply all response interceptors
   */
  private async applyResponseInterceptors(
    response: Response
  ): Promise<Response> {
    let finalResponse = response;

    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse);
    }

    return finalResponse;
  }

  /**
   * Handle expired/missing sessions. 403 is a valid business-level response
   * for forbidden resources and should not sign a still-authenticated user out.
   */
  private async handleAuthError(response: Response): Promise<void> {
    if (response.status === 401) {
      this.clearSessionCache();

      // Redirect to login if in browser
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        // Only redirect if not already on auth pages
        if (
          !currentPath.startsWith("/login") &&
          !currentPath.startsWith("/register")
        ) {
          console.log(
            `[API Client] Redirecting to login due to ${response.status}`
          );
          window.location.href = clientGateUrl("/login", window.location);
        }
      }
    }
  }

  async request<T = unknown>(
    endpoint: string,
    options: ApiRequestInit = {}
  ): Promise<T> {
    const { timeoutMs, ...fetchOptions } = options;
    // Step 1: Get session and prepare initial config
    const session = await this.getCachedSession();

    let headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers || {}),
    };

    // Auto-inject auth token from Supabase session (default behavior)
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    // Step 2: Build initial request config
    let config: RequestInit = {
      ...fetchOptions,
      headers,
    };

    // Step 3: Apply request interceptors (allows modifying config before request)
    config = await this.applyRequestInterceptors(config);

    const isSyncOperation = endpoint.includes("/sync");
    const isDietWrite =
      (config.method === "POST" && endpoint === "/diets") ||
      (config.method === "PUT" && /^\/diets\/\d+$/.test(endpoint));
    return requestJson<T>(`${this.baseURL}${endpoint}`, {
      ...config,
      timeoutMs: timeoutMs ?? (isSyncOperation || isDietWrite ? 60000 : 20000),
    }, (response) => this.handleResponse<T>(response, endpoint));
  }

  private async readJsonBody(response: Response): Promise<unknown | null> {
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private throwApiError(
    response: Response,
    endpoint: string,
    message: string,
    extras?: { code?: string; details?: unknown },
  ): never {
    const error: ApiError = new Error(message);
    error.status = response.status;
    error.statusText = response.statusText;
    error.endpoint = endpoint;
    if (extras?.code) error.code = extras.code;
    if (extras?.details !== undefined) error.details = extras.details;
    throw error;
  }

  private async handleResponse<T = unknown>(
    response: Response,
    endpoint: string,
  ): Promise<T> {
    await this.handleAuthError(response);

    const interceptedResponse = await this.applyResponseInterceptors(response);
    const body = await this.readJsonBody(interceptedResponse);
    const fallback = `API Error: ${interceptedResponse.status} ${interceptedResponse.statusText}`;

    // Standard envelope from route() auth/validation failures (and future ok() routes)
    if (isApiEnvelope(body)) {
      if (!interceptedResponse.ok || body.error) {
        const err = body.error;
        this.throwApiError(
          interceptedResponse,
          endpoint,
          err ? envelopeErrorMessage(err) : fallback,
          err ? { code: err.code, details: err.details } : undefined,
        );
      }
      return body.data as T;
    }

    if (!interceptedResponse.ok) {
      if (body && typeof body === "object") {
        this.throwApiError(
          interceptedResponse,
          endpoint,
          legacyErrorMessage(body, fallback),
          { details: body },
        );
      }
      const text =
        body === null
          ? await interceptedResponse.text().catch(() => "")
          : "";
      this.throwApiError(
        interceptedResponse,
        endpoint,
        text ? `${fallback} - ${text.substring(0, 200)}` : fallback,
      );
    }

    if (body !== null) return body as T;
    if (interceptedResponse.status === 204) return {} as T;
    const error: ApiError = new Error("Sunucudan geçerli bir yanıt alınamadı. Yeniden deneyin.");
    error.code = "invalid_response";
    throw error;
  }

  get<T = unknown>(endpoint: string, options?: ApiRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T = unknown>(
    endpoint: string,
    data?: unknown,
    options?: ApiRequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T = unknown>(
    endpoint: string,
    data?: unknown,
    options?: ApiRequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    options?: ApiRequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T = unknown>(endpoint: string, options?: ApiRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /** Downloads keep the same authentication/interceptors as normal API calls. */
  async download(endpoint: string, filename: string): Promise<void> {
    const session = await this.getCachedSession();
    const headers = new Headers();
    if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
    const config = await this.applyRequestInterceptors({ method: "GET", headers, cache: "no-store" });
    const response = await this.applyResponseInterceptors(await fetch(`${this.baseURL}${endpoint}`, { ...config, signal: AbortSignal.timeout(60000) }));
    await this.handleAuthError(response);
    if (!response.ok) {
      const body = await this.readJsonBody(response);
      this.throwApiError(response, endpoint, isApiEnvelope(body) && body.error ? body.error.message : legacyErrorMessage(body, "Rapor indirilemedi."));
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const apiClient = new ApiClient();
