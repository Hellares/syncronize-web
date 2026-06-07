'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import type { Cotizacion } from '@/core/types/cotizacion';
import * as cotizacionService from '@/features/cotizacion/services/cotizacion-service';
import CotizacionForm from '@/features/cotizacion/components/CotizacionForm';

export default function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cotizacionService.getCotizacion(id)
      .then(setCotizacion)
      .catch(() => setError('Error al cargar la cotizacion'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  if (error || !cotizacion) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">{error || 'Cotizacion no encontrada'}</p>
        <Link href="/dashboard/cotizaciones" className="mt-2 inline-block text-sm text-[#437EFF]">&larr; Volver a cotizaciones</Link>
      </div>
    );
  }

  // Solo BORRADOR es editable (paridad Flutter)
  if (cotizacion.estado !== 'BORRADOR') {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-2">🔒</p>
        <p className="text-gray-600 font-medium">Esta cotizacion no se puede editar</p>
        <p className="mt-1 text-sm text-gray-400">Solo las cotizaciones en estado BORRADOR son editables (actual: {cotizacion.estado}).</p>
        <Link href={`/dashboard/cotizaciones/${id}`} className="mt-3 inline-block text-sm text-[#437EFF]">&larr; Ver detalle</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/cotizaciones/${id}`} className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editar Cotizacion</h1>
          <p className="text-sm text-gray-500">{cotizacion.codigo} &middot; {cotizacion.nombreCliente}</p>
        </div>
      </div>

      <CotizacionForm mode="edit" cotizacionId={id} initialData={cotizacion} />
    </div>
  );
}
