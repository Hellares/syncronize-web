'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/core/auth/auth-context';
import * as authService from '@/features/auth/services/auth-service';
import type { AuthMethodsResponse } from '@/core/types/auth';
import { AxiosError } from 'axios';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isDNI(value: string): boolean {
  return /^\d{8}$/.test(value);
}

export function useLogin() {
  const { login } = useAuth();

  const [email, setEmailState] = useState('');
  const [password, setPasswordState] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<AuthMethodsResponse | null>(null);
  const [isCheckingMethods, setIsCheckingMethods] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const validateEmail = useCallback((value: string): string | null => {
    if (!value.trim()) return 'Ingresa tu email o DNI';
    if (!isValidEmail(value) && !isDNI(value)) {
      return 'Ingresa un email válido o un DNI de 8 dígitos';
    }
    return null;
  }, []);

  const validatePassword = useCallback((value: string): string | null => {
    if (!value) return 'Ingresa tu contraseña';
    return null;
  }, []);

  const checkMethods = useCallback(async (value: string) => {
    if (!isValidEmail(value)) {
      setAvailableMethods(null);
      return;
    }
    setIsCheckingMethods(true);
    try {
      const methods = await authService.checkAuthMethods(value);
      setAvailableMethods(methods);
    } catch {
      setAvailableMethods(null);
    } finally {
      setIsCheckingMethods(false);
    }
  }, []);

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    setError(null);
    if (submitAttempted) {
      setEmailError(validateEmail(value));
    }
    // Debounce checkAuthMethods
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkMethods(value), 500);
  }, [submitAttempted, validateEmail, checkMethods]);

  const setPassword = useCallback((value: string) => {
    setPasswordState(value);
    setError(null);
    if (submitAttempted) {
      setPasswordError(validatePassword(value));
    }
  }, [submitAttempted, validatePassword]);

  const handleLogin = useCallback(async (loginMode?: string, subdominioEmpresa?: string) => {
    setSubmitAttempted(true);

    const eError = validateEmail(email);
    const pError = shouldShowPasswordField ? validatePassword(password) : null;
    setEmailError(eError);
    setPasswordError(pError);

    if (eError || pError) return;

    setIsLoading(true);
    setError(null);

    try {
      await login({
        credencial: email,
        password,
        loginMode,
        subdominioEmpresa,
      });
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, login, validateEmail, validatePassword]);

  const shouldShowPasswordField =
    availableMethods === null || availableMethods.methods.includes('PASSWORD');

  const shouldShowGoogleButton =
    availableMethods === null || availableMethods.methods.includes('GOOGLE');

  return {
    email,
    password,
    setEmail,
    setPassword,
    emailError,
    passwordError,
    isLoading,
    error,
    submitAttempted,
    availableMethods,
    isCheckingMethods,
    shouldShowPasswordField,
    shouldShowGoogleButton,
    handleLogin,
  };
}
