import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";

// API Client configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add the auth token
apiClient.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync("supabase_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("API Error Response:", error.response.data);
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);

      if (error.response.status === 401 || error.response.status === 403) {
        // Clear stored token
        try {
          await SecureStore.deleteItemAsync("supabase_token");
        } catch (storageError) {
          console.error("Error clearing token:", storageError);
        }

        // Redirect to login (handled by auth store)
        console.log("Unauthorized access - redirecting to login");
        // You might want to dispatch a global logout action here
      }
      return Promise.reject(
        new Error(error.response.data.message || "API Error")
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error("API No Response:", error.request);
      return Promise.reject(
        new Error(
          "No response from server. Please check your internet connection."
        )
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("API Request Setup Error:", error.message);
      return Promise.reject(new Error(error.message || "Request failed"));
    }
  }
);

// Wrapper for API calls
const api = {
  // Generic methods
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get(url, config).then((response) => response.data),

  post: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    apiClient.post(url, data, config).then((response) => response.data),

  put: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    apiClient.put(url, data, config).then((response) => response.data),

  patch: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    apiClient.patch(url, data, config).then((response) => response.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete(url, config).then((response) => response.data),

  // Raw axios instance for special cases
  instance: apiClient,
};

export default api;


