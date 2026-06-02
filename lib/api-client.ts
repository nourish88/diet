import { createClient } from "./supabase-browser";
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

    // Return cached session if still valid
    if (
      this.sessionCache &&
      now - this.sessionCache.timestamp < this.SESSION_CACHE_TTL
    ) {
      const cacheAge = Math.round((now - this.sessionCache.timestamp) / 1000);
      console.log(`[API Client] Session cache HIT (age: ${cacheAge}s)`);
      return this.sessionCache.session;
    }

    // Fetch new session
    console.log(`[API Client] Session cache MISS - fetching new session`);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

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
   * Handle authentication errors (401/403)
   * This is called automatically on auth errors
   */
  private async handleAuthError(response: Response): Promise<void> {
    if (response.status === 401 || response.status === 403) {
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
          window.location.href = "/login";
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

    // Step 4: Make the request with timeout
    const controller = new AbortController();
    // Sync and diet write operations can legitimately take longer on
    // serverless cold starts because they touch several related tables.
    const isSyncOperation = endpoint.includes('/sync-measurements') || endpoint.includes('/sync');
    const isDietWrite =
      (config.method === "POST" && endpoint === "/diets") ||
      (config.method === "PUT" && /^\/diets\/\d+$/.test(endpoint));
    const timeoutDuration = timeoutMs ?? (isSyncOperation || isDietWrite ? 60000 : 8000);
    const timeoutId = setTimeout(() => {
      console.error(
        `⏰ [API Client] Request timeout after ${timeoutDuration}ms for ${endpoint}`
      );
      controller.abort();
    }, timeoutDuration);
    
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`📡 [API Client] Making request to: ${url}`);
      const requestStartTime = Date.now();
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      const requestDuration = Date.now() - requestStartTime;
      console.log(`📡 [API Client] Request completed in ${requestDuration}ms, status: ${response.status}`);
      
      clearTimeout(timeoutId);
      return this.handleResponse(response, endpoint);
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏰ [API Client] Request aborted (timeout) for ${endpoint}`);
        const timeoutError: ApiError = new Error(`Request timeout: ${endpoint}`);
        timeoutError.status = 408;
        timeoutError.endpoint = endpoint;
        throw timeoutError;
      }
      console.error(`❌ [API Client] Request error for ${endpoint}:`, error);
      throw error;
    }
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
    return {} as T;
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
}

export const apiClient = new ApiClient();
