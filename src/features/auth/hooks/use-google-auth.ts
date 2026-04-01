'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/core/auth/auth-context';
import type { CredentialResponse } from '@react-oauth/google';
import { AxiosError } from 'axios';

export function useGoogleAuth() {
  const { googleLogin } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  const handleGoogleSuccess = useCallback(async (credentialResponse: CredentialResponse) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setError('No se pudo obtener el token de Google');
      return;
    }

    setGoogleIdToken(idToken);
    setIsLoading(true);
    setError(null);

    try {
      await googleLogin(idToken);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const msg = axiosError.response?.data?.message || 'Error al iniciar sesión con Google';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [googleLogin]);

  const handleGoogleError = useCallback(() => {
    setError('Error en la autenticación con Google');
  }, []);

  const handleGoogleWithMode = useCallback(async (
    loginMode: string,
    subdominioEmpresa?: string
  ) => {
    if (!googleIdToken) {
      setError('Token de Google no disponible. Intenta nuevamente.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await googleLogin(googleIdToken, loginMode, subdominioEmpresa);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const msg = axiosError.response?.data?.message || 'Error al seleccionar modo';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [googleIdToken, googleLogin]);

  return {
    isLoading,
    error,
    googleIdToken,
    handleGoogleSuccess,
    handleGoogleError,
    handleGoogleWithMode,
  };
}
