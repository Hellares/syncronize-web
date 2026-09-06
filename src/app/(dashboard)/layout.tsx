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
            {/* El padding de ARRIBA va a la mitad: la cabecera ya separa visualmente
              con su borde, y el hueco doble empujaba la primera fila --el conteo
              y los botones-- lejos del titulo al que pertenece. Los laterales y
              el de abajo quedan como estaban. */}
          {/* 🔴 Fondo BLANCO desde el 06-09 (antes #f5f7fa). Varias pantallas
              eligieron ring azul o degradado en vez de `border-gray-200`
              PORQUE el gris no se veia sobre el fondo gris; esos rings siguen
              funcionando sobre blanco, pero una superficie `bg-white` sin
              borde ni sombra ahora desaparece. Si aparece una tarjeta que "no
              se ve", es esto. */}
          <main className="flex-1 bg-white p-4 pt-2 md:p-6 md:pt-3 2xl:p-8 2xl:pt-4">
              {children}
            </main>
          </div>
        </div>
      </EmpresaProvider>
    </AuthGuard>
  );
}
