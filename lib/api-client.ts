import { createClient } from './supabase-browser';

/**
 * API Client - Automatic authentication injection for web
 * Mobile app uses its own client in mobile/src/core/api/client.ts
 */
class ApiClient {
  private baseURL = '/api';

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // Auto-inject auth token from Supabase session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to extract detailed error information
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      let errorDetails: any = null;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorDetails = await response.json();
          errorMessage = errorDetails.message || errorDetails.error || errorMessage;
          
          // Include additional context if available
          if (errorDetails.details) {
            errorMessage += ` - ${errorDetails.details}`;
          }
        } else {
          // Non-JSON response, try to get text
          const text = await response.text();
          if (text) {
            errorMessage = `${errorMessage} - ${text.substring(0, 200)}`;
          }
        }
      } catch (parseError) {
        // If we can't parse the error response, include status and endpoint
        console.error(`Failed to parse error response from ${endpoint}:`, parseError);
        errorMessage = `API Error ${response.status}: Failed to parse error response`;
      }
      
      // Create error with detailed information
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).endpoint = endpoint;
      (error as any).details = errorDetails;
      
      throw error;
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return {} as T;
  }

  get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
