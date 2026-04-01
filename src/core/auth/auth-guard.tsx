'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [state.status, router]);

  if (state.status === 'initial' || state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#437EFF] border-t-transparent" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}
