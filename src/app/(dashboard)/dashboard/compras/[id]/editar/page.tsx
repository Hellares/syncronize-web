'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CompraDetalle } from '@/core/types/compra';
import { getCompra } from '@/features/compras/services/compra-service';
import CompraForm from '@/features/compras/components/CompraForm';

/**
 * Edición de una compra en BORRADOR: la misma pantalla del alta, cargada.
 *
 * La compra se lee acá y no dentro del formulario para que el form no tenga
 * que existir a medias mientras llega: sin las líneas ya cargadas, un guardado
 * apurado las reemplazaría por una lista vacía.
 */
export default function EditarCompraPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [compra, setCompra] = useState<CompraDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompra(id)
      .then((c) => {
        // Solo un borrador se edita; el backend igual lo rechaza, pero mandar
        // a alguien a llenar un formulario que no va a poder guardar es peor.
        if (c.estado !== 'BORRADOR') {
          router.replace(`/dashboard/compras/${id}`);
          return;
        }
        setCompra(c);
      })
      .catch(() => setError('No se pudo cargar la compra'));
  }, [id, router]);

  if (error) {
    return (
      <div className="p-6">
        <Link href={`/dashboard/compras/${id}`} className="text-xs text-[#437EFF]">← Volver a la compra</Link>
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!compra) return <div className="p-6 text-sm text-gray-500">Cargando compra…</div>;

  return <CompraForm compra={compra} />;
}
