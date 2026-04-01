import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, getTenantId, setTokens, clearAll } from '@/core/auth/token-service';
import { AUTH_ENDPOINTS } from './endpoints';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Main client with interceptors
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Plain instance for refresh (no interceptors, avoids loops)
const authAxios = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Callback for auth failure — set by AuthProvider to use Next.js router
let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(callback: () => void) {
  onAuthFailure = callback;
}

// --- Request Interceptor ---

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const tenantId = getTenantId();
  const isSwitchTenant = config.url?.includes(AUTH_ENDPOINTS.SWITCH_TENANT);
  if (tenantId && !isSwitchTenant) {
    config.headers['x-tenant-id'] = tenantId;
  }

  return config;
});

// --- Response Interceptor (refresh on 401) ---

// Only skip refresh for endpoints where it doesn't make sense
const NO_REFRESH_PATHS = [
  AUTH_ENDPOINTS.LOGIN,
  AUTH_ENDPOINTS.REGISTER,
  AUTH_ENDPOINTS.REFRESH,
  AUTH_ENDPOINTS.LOGOUT,
  AUTH_ENDPOINTS.GOOGLE,
];

const isNoRefreshEndpoint = (url?: string) =>
  url ? NO_REFRESH_PATHS.some((path) => url.includes(path)) : false;

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (token) p.resolve(token);
    else p.reject(error);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isNoRefreshEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject: (err: unknown) => reject(err),
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await authAxios.post(AUTH_ENDPOINTS.REFRESH, { refreshToken });
      setTokens(data.accessToken, data.refreshToken);
      processQueue(null, data.accessToken);

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAll();
      onAuthFailure?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
