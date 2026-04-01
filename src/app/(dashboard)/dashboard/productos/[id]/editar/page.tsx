'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProductoDetail } from '@/features/producto/hooks/use-producto-detail';
import ProductoForm from '@/features/producto/components/ProductoForm';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

export default function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { producto, isLoading, error } = useProductoDetail(id);
  const { empresa } = useEmpresa();

  if (isLoading || !empresa) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">{error || 'Producto no encontrado'}</p>
        <Link href="/dashboard/productos" className="mt-4 inline-block text-sm text-[#437EFF] hover:underline">
          Volver a productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href={`/dashboard/productos/${id}`} className="text-sm text-gray-500 hover:text-[#437EFF]">&larr; Volver al producto</Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">Editar Producto</h1>
        <p className="text-sm text-gray-500">{producto.nombre}</p>
      </div>
      <ProductoForm empresaId={empresa.id} producto={producto} />
    </div>
  );
}
