'use client';

import ProductoForm from '@/features/producto/components/ProductoForm';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

export default function NuevoProductoPage() {
  const { empresa } = useEmpresa();

  if (!empresa) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
      </div>
    );
  }

  return (
    // Sin tope de ancho ni centrado, igual que el DETALLE del producto: con
    // `max-w-3xl` (768px) las dos columnas quedaban angostas por mas grande
    // que fuera la pantalla. El listado tampoco tiene tope.
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Nuevo Producto</h1>
        <p className="text-sm text-gray-500">Completa la información del producto</p>
      </div>
      <ProductoForm empresaId={empresa.id} />
    </div>
  );
}
