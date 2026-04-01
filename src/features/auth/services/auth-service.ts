import { apiClient } from '@/core/api/client';
import { AUTH_ENDPOINTS } from '@/core/api/endpoints';
import type {
  AuthResponse,
  AuthMethodsResponse,
  LoginRequest,
  GoogleAuthRequest,
  User,
} from '@/core/types/auth';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, data);
  return res.data;
}

export async function googleAuth(data: GoogleAuthRequest): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.GOOGLE, data);
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post(AUTH_ENDPOINTS.LOGOUT);
}

export async function getProfile(): Promise<User> {
  const res = await apiClient.get<User>(AUTH_ENDPOINTS.PROFILE);
  return res.data;
}

export async function validateSession(): Promise<boolean> {
  try {
    const res = await apiClient.get<{ valid: boolean }>(AUTH_ENDPOINTS.VALIDATE_SESSION);
    return res.data.valid;
  } catch {
    return false;
  }
}

export async function checkAuthMethods(email: string): Promise<AuthMethodsResponse> {
  const res = await apiClient.post<AuthMethodsResponse>(AUTH_ENDPOINTS.CHECK_METHODS, { email });
  return res.data;
}

export async function switchTenant(empresaId: string, subdominioEmpresa?: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.SWITCH_TENANT, {
    empresaId,
    subdominioEmpresa,
  });
  return res.data;
}
