'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/core/auth/auth-context';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [state.status, router]);

  if (state.status === 'authenticated') {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0891b2] via-[#2563eb] to-[#437EFF] px-4 py-12">
      {/* Blobs */}
      <div className="blob blob-1 bg-[#06b6d4]" />
      <div className="blob blob-2 bg-[#437EFF]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <img
            src="/logo.svg"
            alt="Syncronize"
            className="h-12 w-12 brightness-0 invert"
          />
          <span
            className="text-3xl text-white tracking-wide"
            style={{ fontFamily: 'Airstrike', fontWeight: 'bold' }}
          >
            Syncronize
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {children}
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-white/60">
          <a href="/" className="hover:text-white transition-colors">
            &larr; Volver al inicio
          </a>
        </p>
      </div>
    </div>
  );
}
