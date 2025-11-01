import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import SecureStorage, { STORAGE_KEYS } from "../storage/secure-storage";

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
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Use the same SecureStorage instance as auth store
      const token = await SecureStorage.getItem(STORAGE_KEYS.SUPABASE_TOKEN);
      console.log("🔑 Interceptor - Token from SecureStorage:", token ? "✅ Found" : "❌ Not found");
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("✅ Token added to headers:", `Bearer ${token.substring(0, 20)}...`);
      } else {
        console.log("⚠️ No token in SecureStorage");
      }
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
    }
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
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
          await SecureStorage.deleteItem(STORAGE_KEYS.SUPABASE_TOKEN);
          console.log("🗑️ Token cleared due to 401/403");
        } catch (storageError) {
          console.error("Error clearing token:", storageError);
        }

        // Redirect to login (handled by auth store)
        console.log("❌ Unauthorized access - token may be expired");
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
  get: <T = any>(url: string, config?: any): Promise<T> => {
    console.log("📤 API GET:", url);
    return apiClient.get(url, config).then((response) => response.data);
  },

  post: <T = any>(
    url: string,
    data?: any,
    config?: any
  ): Promise<T> => {
    console.log("📤 API POST:", url);
    return apiClient.post(url, data, config).then((response) => response.data);
  },

  put: <T = any>(
    url: string,
    data?: any,
    config?: any
  ): Promise<T> => {
    console.log("📤 API PUT:", url);
    return apiClient.put(url, data, config).then((response) => response.data);
  },

  patch: <T = any>(
    url: string,
    data?: any,
    config?: any
  ): Promise<T> => {
    console.log("📤 API PATCH:", url);
    return apiClient.patch(url, data, config).then((response) => response.data);
  },

  delete: <T = any>(url: string, config?: any): Promise<T> => {
    console.log("📤 API DELETE:", url);
    return apiClient.delete(url, config).then((response) => response.data);
  },

  // Raw axios instance for special cases
  instance: apiClient,
};

export default api;




