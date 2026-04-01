'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

interface Props {
  onSuccess: (credentialResponse: CredentialResponse) => void;
}

export default function GoogleSignInButton({ onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" />
        </div>
      ) : (
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={(res) => {
              setIsLoading(true);
              setError(null);
              onSuccess(res);
              timeoutRef.current = setTimeout(() => setIsLoading(false), 3000);
            }}
            onError={() => setError('Error en la autenticación con Google')}
            size="large"
            width="100%"
            text="signin_with"
            theme="outline"
          />
        </div>
      )}
      {error && (
        <p className="mt-2 text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
