'use client';

import { useState } from 'react';
import AuthGuard from '@/core/auth/auth-guard';
import { EmpresaProvider } from '@/features/empresa/context/empresa-context';
import Sidebar from '@/components/layout/Sidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <EmpresaProvider>
        <div className="flex min-h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex flex-1 flex-col">
            <DashboardHeader onMenuToggle={() => setSidebarOpen(true)} />
            <main className="flex-1 bg-[#f5f7fa] p-4 md:p-6 2xl:p-8">
              {children}
            </main>
          </div>
        </div>
      </EmpresaProvider>
    </AuthGuard>
  );
}
