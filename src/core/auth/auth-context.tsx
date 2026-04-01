'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthState, User, Tenant, LoginRequest, GoogleAuthRequest, ModeOption, AuthResponse } from '@/core/types/auth';
import * as tokenService from '@/core/auth/token-service';
import * as authService from '@/features/auth/services/auth-service';
import { setOnAuthFailure } from '@/core/api/client';

// --- Reducer ---

type AuthAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_AUTHENTICATED'; user: User; tenant: Tenant | null }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_MODE_SELECTION'; user: User; options: ModeOption[]; tokens?: { accessToken: string; refreshToken: string } }
  | { type: 'SET_INITIAL' };

function authReducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { status: 'loading' };
    case 'SET_AUTHENTICATED':
      return { status: 'authenticated', user: action.user, tenant: action.tenant };
    case 'SET_UNAUTHENTICATED':
      return { status: 'unauthenticated' };
    case 'SET_MODE_SELECTION':
      return {
        status: 'mode-selection',
        user: action.user,
        options: action.options,
        tokens: action.tokens ? { ...action.tokens, expiresIn: '' } : undefined,
      };
    case 'SET_INITIAL':
      return { status: 'initial' };
  }
}

// --- Context ---

interface AuthContextType {
  state: AuthState;
  login: (data: LoginRequest) => Promise<AuthResponse>;
  googleLogin: (idToken: string, loginMode?: string, subdominioEmpresa?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  selectMode: (loginMode: string, subdominioEmpresa?: string) => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// --- Helper ---

function processAuthResponse(
  response: AuthResponse,
  dispatch: React.Dispatch<AuthAction>
) {
  if (response.requiresSelection && response.options) {
    dispatch({
      type: 'SET_MODE_SELECTION',
      user: response.user,
      options: response.options,
      tokens: response.accessToken && response.refreshToken
        ? { accessToken: response.accessToken, refreshToken: response.refreshToken }
        : undefined,
    });
    return;
  }

  // Save tokens
  if (response.accessToken && response.refreshToken) {
    tokenService.setTokens(response.accessToken, response.refreshToken);
  }

  // Save user
  tokenService.setUser(response.user);

  // Save tenant
  if (response.tenant) {
    tokenService.setTenantInfo(response.tenant);
  }

  // Save login mode
  if (response.mode) {
    tokenService.setLoginMode(response.mode);
  }

  // Set logged in flag + cookie
  tokenService.setLoggedIn(true);

  dispatch({
    type: 'SET_AUTHENTICATED',
    user: response.user,
    tenant: response.tenant || null,
  });
}

// --- Provider ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { status: 'loading' });

  // Register auth failure callback for Axios interceptor
  useEffect(() => {
    setOnAuthFailure(() => {
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    });
  }, []);

  const checkAuthStatus = useCallback(async () => {
    if (!tokenService.isLoggedIn()) {
      dispatch({ type: 'SET_UNAUTHENTICATED' });
      return;
    }

    // If we have tokens and user data locally, authenticate immediately
    const localUser = tokenService.getUser();
    const localTenant = tokenService.getTenantInfo();

    if (localUser) {
      dispatch({ type: 'SET_AUTHENTICATED', user: localUser, tenant: localTenant });

      // Validate session in background (don't block rendering)
      try {
        const valid = await authService.validateSession();
        if (!valid) {
          // Try refresh via getProfile (interceptor will refresh token on 401)
          try {
            const profile = await authService.getProfile();
            tokenService.setUser(profile);
            dispatch({ type: 'SET_AUTHENTICATED', user: profile, tenant: localTenant });
          } catch {
            tokenService.clearAll();
            dispatch({ type: 'SET_UNAUTHENTICATED' });
          }
        }
      } catch {
        // Network error — stay authenticated with local data
      }
      return;
    }

    // No local user — try to fetch profile
    dispatch({ type: 'SET_LOADING' });
    try {
      const profile = await authService.getProfile();
      tokenService.setUser(profile);
      const tenant = tokenService.getTenantInfo();
      dispatch({ type: 'SET_AUTHENTICATED', user: profile, tenant });
    } catch {
      tokenService.clearAll();
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const loginFn = useCallback(async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await authService.login(data);
      processAuthResponse(response, dispatch);
      return response;
    } catch (error) {
      // Don't reset to unauthenticated if we were in mode-selection
      if (!data.loginMode) {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
      throw error;
    }
  }, []);

  const googleLoginFn = useCallback(async (
    idToken: string,
    loginMode?: string,
    subdominioEmpresa?: string
  ): Promise<AuthResponse> => {
    try {
      const data: GoogleAuthRequest = { idToken, loginMode, subdominioEmpresa };
      const response = await authService.googleAuth(data);
      processAuthResponse(response, dispatch);
      return response;
    } catch (error) {
      if (!loginMode) {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
      throw error;
    }
  }, []);

  const logoutFn = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore logout errors
    }
    tokenService.clearAll();
    dispatch({ type: 'SET_UNAUTHENTICATED' });
  }, []);

  const selectModeFn = useCallback((_loginMode: string, _subdominioEmpresa?: string) => {
    // Mode selection is handled by re-calling login/googleLogin from the component
    // This resets back to unauthenticated so the form can re-submit
    dispatch({ type: 'SET_UNAUTHENTICATED' });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        login: loginFn,
        googleLogin: googleLoginFn,
        logout: logoutFn,
        selectMode: selectModeFn,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
