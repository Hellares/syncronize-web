'use client';

import { useState } from 'react';
import { useAuth } from '@/core/auth/auth-context';
import { useLogin } from '../hooks/use-login';
import GoogleSignInButton from './GoogleSignInButton';
import ModeSelector from './ModeSelector';
import type { CredentialResponse } from '@react-oauth/google';
import { AxiosError } from 'axios';

export default function LoginForm() {
  const { state, login, googleLogin } = useAuth();
  const {
    email,
    password,
    setEmail,
    setPassword,
    emailError,
    passwordError,
    isLoading,
    error,
    shouldShowPasswordField,
    shouldShowGoogleButton,
    handleLogin,
  } = useLogin();

  // Store credentials for mode selection re-submit
  const [savedGoogleIdToken, setSavedGoogleIdToken] = useState<string | null>(null);
  const [modeLoading, setModeLoading] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const idToken = credentialResponse.credential;
    if (!idToken) return;
    setSavedGoogleIdToken(idToken);
    try {
      await googleLogin(idToken);
    } catch {
      // error handled by context
    }
  };

  const handleModeSelect = async (loginMode: string, subdominioEmpresa?: string) => {
    if (modeLoading) return; // Prevent double-click
    setModeLoading(true);
    setModeError(null);
    try {
      if (savedGoogleIdToken) {
        await googleLogin(savedGoogleIdToken, loginMode, subdominioEmpresa);
      } else if (email && password) {
        await login({ credencial: email, password, loginMode, subdominioEmpresa });
      }
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setModeError(msg || 'Error al seleccionar modo');
    } finally {
      setModeLoading(false);
    }
  };

  // Mode selection screen
  if (state.status === 'mode-selection') {
    return (
      <div>
        <ModeSelector
          options={state.options}
          onSelect={handleModeSelect}
          isLoading={modeLoading}
        />
        {modeError && (
          <p className="mt-3 text-center text-sm text-red-500">{modeError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ingresa a tu cuenta de Syncronize
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
        className="space-y-4"
      >
        {/* Email / DNI */}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email o DNI
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com o 12345678"
            autoComplete="email"
            className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:ring-2 ${
              emailError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:border-[#437EFF] focus:ring-[#437EFF]/20'
            }`}
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-500">{emailError}</p>
          )}
        </div>

        {/* Password */}
        {shouldShowPasswordField && (
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:ring-2 ${
                passwordError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-[#437EFF] focus:ring-[#437EFF]/20'
              }`}
            />
            {passwordError && (
              <p className="mt-1 text-xs text-red-500">{passwordError}</p>
            )}
          </div>
        )}

        {/* Forgot password */}
        <div className="text-right">
          <a href="#" className="text-xs text-[#437EFF] hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#004A94] py-3 text-sm font-bold text-white transition-all hover:bg-[#003570] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Ingresando...
            </div>
          ) : (
            'Iniciar Sesión'
          )}
        </button>
      </form>

      {/* Divider */}
      {shouldShowGoogleButton && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">o continuar con</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <GoogleSignInButton onSuccess={handleGoogleSuccess} />
        </>
      )}
    </div>
  );
}
