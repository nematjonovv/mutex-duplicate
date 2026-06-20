import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { message } from "@/utils/StaticAntd";
import { useAuthStore } from "@/store/authStore";

// API base configuration
const getBaseURL = () => {
  const savedIP = localStorage.getItem("server_ip")?.trim();
  
  // IP manzil formatini tekshirish (masalan: 192.168.1.1)
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  if (savedIP && ipRegex.test(savedIP)) {
    return `http://${savedIP}:5000/api`;
  }
  
  // Agar kiritilgan IP noto'g'ri bo'lsa va bu localhost bo'lmasa, ogohlantirish
  if (savedIP && savedIP !== 'localhost' && !ipRegex.test(savedIP)) {
    console.error("Noto'g'ri IP manzil formati saqlangan:", savedIP);
  }
  
  return import.meta.env.VITE_API_URL || "/api";
};

const API_BASE_URL = getBaseURL();

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // Timeoutni qisqartiramiz (5 soniya)
  headers: {
    "Content-Type": "application/json",
  },
});

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/refresh-token',
  '/auth/register',
];

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Check if this is a public endpoint
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint =>
      config.url?.includes(endpoint)
    );

    // Skip adding token for public endpoints
    if (isPublicEndpoint) {
      return config;
    }

    // Get token from session storage first
    let token = null;
    const storedAuth = sessionStorage.getItem("auth-storage");

    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        token = authData.state?.accessToken;
      } catch (error) {
        console.error("Error parsing sessionStorage:", error);
      }
    }

    // If no token in session storage, try auth store
    if (!token) {
      token = useAuthStore.getState().accessToken;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("No authorization token found for protected request:", config.url);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Toast xabarlarini takrorlanishidan himoya qilish uchun
let lastErrorTime = 0;
const ERROR_COOLDOWN = 30000; // 30 soniya ichida bir xil xato chiqmaydi

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          // Update token in auth store
          useAuthStore.getState().setTokens(accessToken, refreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const currentTime = Date.now();
    const isNetworkError = error.code === 'ERR_NETWORK' || error.message === 'Network Error';

    if (isNetworkError) {
      // Tarmoq xatoligi bo'lsa va cooldown vaqti tugagan bo'lsa toast chiqaramiz
      if (currentTime - lastErrorTime > ERROR_COOLDOWN) {
        message?.error("Serverga ulanib bo'lmadi. Tarmoqni yoki IP manzilni tekshiring.");
        lastErrorTime = currentTime;
      }
      console.warn("Network Error suppressed to prevent loop");
    } else {
      const errorMessage = error.response?.data?.message || error.message || "An error occurred";
      
      if (error.response?.status !== 401 && error.response?.status !== 404 && error.response?.status !== 403) {
        if (currentTime - lastErrorTime > ERROR_COOLDOWN) {
          message?.error(errorMessage);
          lastErrorTime = currentTime;
        }
      }
    }

    return Promise.reject(error);
  }
);

// Generic API methods
export const apiService = {
  // GET request
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<T>(url, config);
    return response.data;
  },

  // POST request
  post: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },

  // PUT request
  put: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },

  // PATCH request
  patch: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await api.patch<T>(url, data, config);
    return response.data;
  },

  // DELETE request
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<T>(url, config);
    return response.data;
  },

  // Upload file
  upload: async <T>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await api.post<T>(url, formData, {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...config?.headers,
      },
    });
    return response.data;
  },
};

// Utility function to check auth status
export const checkAuthStatus = () => {
  const storeToken = useAuthStore.getState().accessToken;
  const storedAuth = sessionStorage.getItem("auth-storage");

  return {
    storeToken: !!storeToken,
    sessionStorageToken: !!storedAuth,
  };
};

export default api;
