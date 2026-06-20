'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Proveedor } from '@/core/types/proveedor';
import {
  listarProveedores,
  eliminarProveedor,
  registrarComoCliente,
} from '@/features/proveedores/services/proveedor-service';
import ProveedorFormDialog from '@/features/proveedores/components/ProveedorFormDialog';

export default function ProveedoresPage() {
  const router = useRouter();
  const [items, setItems] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listarProveedores());
    } catch {
      setError('No se pudieron cargar los proveedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) =>
      [p.nombre, p.nombreComercial, p.numeroDocumento, p.codigo]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const onVincular = async (p: Proveedor) => {
    try {
      const r = await registrarComoCliente(p.id);
      showToast(
        r.accion === 'CREADO' ? 'Registrado como cliente ✓'
        : r.accion === 'VINCULADO_EXISTENTE' ? 'Vinculado al cliente existente ✓'
        : 'Ya era cliente',
      );
      cargar();
    } catch {
      showToast('No se pudo registrar como cliente');
    }
  };

  const onEliminar = async (p: Proveedor) => {
    if (!confirm(`¿Eliminar el proveedor "${p.nombre}"?`)) return;
    try {
      await eliminarProveedor(p.id);
      showToast('Proveedor eliminado');
      cargar();
    } catch {
      showToast('No se pudo eliminar');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#004A94]">Proveedores</h1>
          <p className="text-xs text-gray-500">Gestión de proveedores y su cuenta corriente.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74]"
        >
          + Nuevo proveedor
        </button>
      </div>

      <input
        className="mb-3 w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
        placeholder="Buscar por nombre, RUC o código…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">Cargando…</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-600">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">Sin proveedores.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-left">Documento</th>
                <th className="px-3 py-2 text-left">Contacto</th>
                <th className="px-3 py-2 text-left">Términos</th>
                <th className="px-3 py-2 text-center">Cliente</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{p.codigo}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">{p.nombre}</div>
                    {p.nombreComercial && <div className="text-xs text-gray-500">{p.nombreComercial}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{p.tipoDocumento} · {p.numeroDocumento}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {p.telefono || '—'}{p.email ? ` · ${p.email}` : ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{p.terminosPago?.replace('_', ' ') ?? '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {p.clienteEmpresa ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        {p.clienteEmpresa.codigo}
                      </span>
                    ) : (
                      <button onClick={() => onVincular(p)} className="text-[11px] text-[#437EFF] hover:underline">
                        Registrar
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => router.push(`/dashboard/proveedores/${p.id}/estado-cuenta`)}
                        className="text-[#004A94] hover:underline"
                      >
                        Estado de cuenta
                      </button>
                      <button onClick={() => { setEditing(p); setDialogOpen(true); }} className="text-gray-600 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => onEliminar(p)} className="text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProveedorFormDialog
        isOpen={dialogOpen}
        proveedor={editing}
        onClose={() => setDialogOpen(false)}
        onSuccess={(msg) => { setDialogOpen(false); showToast(msg); cargar(); }}
      />

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
