'use client';

import { useState } from 'react';
import type { ProductoVariante } from '@/core/types/producto';

interface Props {
  isOpen: boolean;
  variante: ProductoVariante | null;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VarianteDetailDialog({ isOpen, variante, onClose }: Props) {
  const [imgIndex, setImgIndex] = useState(0);

  if (!isOpen || !variante) return null;

  const images = variante.archivos?.filter(a => a.url) ?? [];
  const stockTotal = variante.stocksPorSede?.reduce((sum, s) => sum + s.cantidad, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>

        {/* Imágenes */}
        {images.length > 0 && (
          <div className="relative bg-gray-100 rounded-t-2xl">
            <img
              src={images[imgIndex]?.url}
              alt={variante.nombre}
              className="h-48 w-full object-contain"
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setImgIndex(i)}
                    className={`h-2 rounded-full transition-all ${i === imgIndex ? 'w-5 bg-[#437EFF]' : 'w-2 bg-gray-400'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{variante.nombre}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${variante.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {variante.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {/* Códigos */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon="tag" label="Código" value={variante.codigoEmpresa} />
            <InfoRow icon="qr" label="SKU" value={variante.sku} />
            {variante.codigoBarras && (
              <InfoRow icon="barcode" label="Código de Barras" value={variante.codigoBarras} />
            )}
            {variante.peso != null && (
              <InfoRow icon="weight" label="Peso" value={`${variante.peso} kg`} />
            )}
          </div>

          {/* Dimensiones */}
          {variante.dimensiones && Object.keys(variante.dimensiones).length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500 uppercase">Dimensiones</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(variante.dimensiones).map(([key, val]) => (
                  <span key={key} className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                    {key}: {val}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Atributos */}
          {variante.atributosValores.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500 uppercase">Atributos</p>
              <div className="flex flex-wrap gap-1.5">
                {variante.atributosValores.map(av => (
                  <span key={av.id} className="rounded-full border border-[#437EFF]/20 bg-[#437EFF]/5 px-2.5 py-1 text-xs font-medium text-[#437EFF]">
                    {av.atributo.nombre}: {av.valor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stock por Sede */}
          {variante.stocksPorSede && variante.stocksPorSede.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Stock por Sede</p>
                <span className="text-xs font-bold text-gray-700">Total: {stockTotal}</span>
              </div>
              <div className="space-y-2">
                {variante.stocksPorSede.map(s => (
                  <div key={s.sedeId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-700">{s.sedeNombre}</span>
                    <div className="flex items-center gap-3">
                      {s.precioConfigurado && s.precio != null && (
                        <span className={`text-sm font-medium ${s.enOferta ? 'text-green-600' : 'text-gray-700'}`}>
                          S/ {Number(s.enOferta && s.precioOferta ? s.precioOferta : s.precio).toFixed(2)}
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.cantidad <= 0 ? 'bg-red-100 text-red-700' : s.stockMinimo && s.cantidad <= s.stockMinimo ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {s.cantidad}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="flex gap-4 text-[11px] text-gray-400 border-t border-gray-100 pt-3">
            <span>Creado: {formatDate(variante.creadoEn)}</span>
            <span>Actualizado: {formatDate(variante.actualizadoEn)}</span>
          </div>

          {/* Cerrar */}
          <div className="flex justify-end">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const icons: Record<string, React.ReactNode> = {
    tag: <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />,
    qr: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />,
    barcode: <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h1v16H3V4zm3 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4z" />,
    weight: <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />,
  };
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icons[icon]}
        </svg>
        <span className="text-[10px] font-medium uppercase text-gray-400">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
