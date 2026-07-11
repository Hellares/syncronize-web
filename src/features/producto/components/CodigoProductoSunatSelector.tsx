'use client';

import { useMemo, useState } from 'react';
import {
  CATALOGO_CODIGOS_PRODUCTO_SUNAT,
  GRUPOS_ORDEN,
  buscarCodigoProductoSunat,
  type CodigoProductoSunat,
} from '../data/codigo-producto-sunat';

interface Props {
  /** Código actual ('' = sin código) */
  value: string;
  /** Nuevo código ('' = quitar) */
  onChange: (codigo: string) => void;
}

/**
 * Selector de código producto SUNAT (catálogo 25). Lista curada, nunca texto
 * libre: desde 01.08.2026 un código inválido es rechazo SUNAT (ERR-3496).
 * Espejo del bottom sheet de Flutter (codigo_producto_sunat_selector.dart).
 */
export default function CodigoProductoSunatSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const seleccion = buscarCodigoProductoSunat(value);

  const grupos = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtrados = q
      ? CATALOGO_CODIGOS_PRODUCTO_SUNAT.filter(
          (c) =>
            c.codigo.includes(q) ||
            c.descripcion.toLowerCase().includes(q) ||
            c.grupo.toLowerCase().includes(q)
        )
      : CATALOGO_CODIGOS_PRODUCTO_SUNAT;
    const porGrupo = new Map<string, CodigoProductoSunat[]>();
    for (const c of filtrados) {
      const arr = porGrupo.get(c.grupo) ?? [];
      arr.push(c);
      porGrupo.set(c.grupo, arr);
    }
    return GRUPOS_ORDEN.filter((g) => porGrupo.has(g)).map((g) => ({
      grupo: g,
      items: porGrupo.get(g)!,
    }));
  }, [search]);

  const handleSelect = (codigo: string) => {
    onChange(codigo);
    setOpen(false);
    setSearch('');
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        Código Producto SUNAT (catálogo 25)
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
            value
              ? 'border-[#437EFF]/40 bg-[#437EFF]/5 text-gray-800'
              : 'border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          {value
            ? `${value} — ${seleccion?.descripcion ?? 'Código del catálogo 25'}`
            : 'Sin código (opcional)'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Quitar código"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
          >
            Quitar
          </button>
        )}
      </div>
      <p className="mt-1 text-[10px] text-gray-400">
        Solo obligatorio para RUCs del padrón 12 de SUNAT. Sin código, el comprobante sale sin el tag.
      </p>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Código Producto SUNAT</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Catálogo N.° 25 (anexos 25.1, 25.2, 25.3). Lista curada — un código inválido es rechazo SUNAT desde 01.08.2026.
              </p>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, descripción o grupo..."
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {value && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Quitar código
                </button>
              )}
              {grupos.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">Sin resultados para &quot;{search}&quot;</p>
              )}
              {grupos.map(({ grupo, items }) => (
                <div key={grupo} className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {grupo}
                  </p>
                  {items.map((c, i) => (
                    <button
                      key={`${c.codigo}-${i}`}
                      type="button"
                      onClick={() => handleSelect(c.codigo)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50 ${
                        c.codigo === value ? 'bg-[#437EFF]/10' : ''
                      }`}
                    >
                      <span className="font-mono text-xs font-medium text-[#004A94]">{c.codigo}</span>
                      <span className="flex-1 text-sm text-gray-700">{c.descripcion}</span>
                      {c.codigo === value && (
                        <svg className="h-4 w-4 text-[#437EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 p-3 text-right">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
