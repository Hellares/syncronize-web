import type { User, Tenant } from '@/core/types/auth';

const KEYS = {
  ACCESS_TOKEN: 'sync_access_token',
  REFRESH_TOKEN: 'sync_refresh_token',
  TENANT_ID: 'sync_tenant_id',
  TENANT_NAME: 'sync_tenant_name',
  TENANT_ROLE: 'sync_tenant_role',
  LOGIN_MODE: 'sync_login_mode',
  USER_DATA: 'sync_user_data',
  IS_LOGGED_IN: 'sync_is_logged_in',
} as const;

const COOKIE_NAME = 'sync_logged_in';
const COOKIE_MAX_AGE = 604800; // 7 days

function isBrowser() {
  return typeof window !== 'undefined';
}

// --- Tokens ---

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEYS.REFRESH_TOKEN);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.ACCESS_TOKEN);
  localStorage.removeItem(KEYS.REFRESH_TOKEN);
}

// --- User ---

export function getUser(): User | null {
  if (!isBrowser()) return null;
  const data = localStorage.getItem(KEYS.USER_DATA);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
}

// --- Tenant ---

export function getTenantId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEYS.TENANT_ID);
}

export function getTenantInfo(): Tenant | null {
  if (!isBrowser()) return null;
  const id = localStorage.getItem(KEYS.TENANT_ID);
  const name = localStorage.getItem(KEYS.TENANT_NAME);
  const role = localStorage.getItem(KEYS.TENANT_ROLE);
  if (!id || !name || !role) return null;
  return { id, name, role };
}

export function setTenantInfo(tenant: Tenant): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.TENANT_ID, tenant.id);
  localStorage.setItem(KEYS.TENANT_NAME, tenant.name);
  localStorage.setItem(KEYS.TENANT_ROLE, tenant.role);
}

export function clearTenantInfo(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.TENANT_ID);
  localStorage.removeItem(KEYS.TENANT_NAME);
  localStorage.removeItem(KEYS.TENANT_ROLE);
}

// --- Login Mode ---

export function getLoginMode(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEYS.LOGIN_MODE);
}

export function setLoginMode(mode: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEYS.LOGIN_MODE, mode);
}

// --- Logged In Flag (localStorage + cookie for middleware) ---

export function isLoggedIn(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(KEYS.IS_LOGGED_IN) === '1';
}

export function setLoggedIn(value: boolean): void {
  if (!isBrowser()) return;
  if (value) {
    localStorage.setItem(KEYS.IS_LOGGED_IN, '1');
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    localStorage.removeItem(KEYS.IS_LOGGED_IN);
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

// --- Clear All ---

export function clearAll(): void {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
