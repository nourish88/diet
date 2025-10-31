import { supabase } from "@/lib/supabase";

/**
 * Centralized API client for all authenticated requests
 * Automatically handles authentication, error handling, and response parsing
 */
class ApiClient {
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization header if session exists
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      return headers;
    } catch (error) {
      console.error("Error getting auth headers:", error);
      return {
        "Content-Type": "application/json",
      };
    }
  }

  private handleError(response: Response, context: string = "API call"): never {
    if (response.status === 401) {
      throw new Error("Authentication required. Please log in.");
    } else if (response.status === 403) {
      throw new Error(
        "Access denied. You don't have permission for this action."
      );
    } else if (response.status === 404) {
      throw new Error("Resource not found.");
    } else if (response.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }
    throw new Error(`${context} failed with status: ${response.status}`);
  }

  /**
   * Make an authenticated GET request
   */
  async get<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: "GET",
      headers: { ...headers, ...options.headers },
      cache: "no-store",
      ...options,
    });

    if (!response.ok) {
      this.handleError(response, `GET ${url}`);
    }

    return response.json();
  }

  /**
   * Make an authenticated POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, ...options.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      this.handleError(response, `POST ${url}`);
    }

    return response.json();
  }

  /**
   * Make an authenticated PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: "PUT",
      headers: { ...headers, ...options.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      this.handleError(response, `PUT ${url}`);
    }

    return response.json();
  }

  /**
   * Make an authenticated PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: "PATCH",
      headers: { ...headers, ...options.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      this.handleError(response, `PATCH ${url}`);
    }

    return response.json();
  }

  /**
   * Make an authenticated DELETE request
   */
  async delete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: "DELETE",
      headers: { ...headers, ...options.headers },
      ...options,
    });

    if (!response.ok) {
      this.handleError(response, `DELETE ${url}`);
    }

    return response.json();
  }

  /**
   * Make a raw authenticated request (for special cases)
   */
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      headers: { ...headers, ...options.headers },
      ...options,
    });

    return response;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Legacy exports for backward compatibility
export const authenticatedFetch = apiClient.request.bind(apiClient);
export const handleApiError = (
  response: Response,
  context: string = "API call"
) => {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required. Please log in.");
    } else if (response.status === 403) {
      throw new Error(
        "Access denied. You don't have permission for this action."
      );
    } else if (response.status === 404) {
      throw new Error("Resource not found.");
    } else if (response.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }
    throw new Error(`${context} failed with status: ${response.status}`);
  }
};
