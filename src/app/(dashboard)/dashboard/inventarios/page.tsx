'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import type { Inventario, EstadoInventario, TipoInventario } from '@/core/types/inventario';
import { ESTADO_INVENTARIO_LABEL, ESTADO_INVENTARIO_COLOR } from '@/core/types/inventario';
import * as inventarioService from '@/features/stock/services/inventario-service';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20";
const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] bg-white";

const TIPOS: { value: TipoInventario; label: string }[] = [
  { value: 'COMPLETO', label: 'Completo (toda la sede)' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'CICLICO', label: 'Cíclico' },
  { value: 'SORPRESA', label: 'Sorpresa / auditoría' },
  { value: 'TEMPORAL', label: 'Temporal' },
];

const ESTADOS: EstadoInventario[] = ['PLANIFICADO', 'EN_PROCESO', 'CONTEO_COMPLETO', 'APROBADO', 'AJUSTADO', 'CANCELADO'];

export default function InventariosPage() {
  const router = useRouter();
  const { sedes } = useEmpresa();
  const permissions = usePermissions();

  const [items, setItems] = useState<Inventario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sedeId, setSedeId] = useState('');
  const [estado, setEstado] = useState('');
  const [crearOpen, setCrearOpen] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await inventarioService.getInventarios({
        sedeId: sedeId || undefined,
        estado: (estado || undefined) as EstadoInventario | undefined,
      });
      setItems(data);
    } catch {
      setError('Error al cargar inventarios');
    } finally {
      setIsLoading(false);
    }
  }, [sedeId, estado]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario Físico</h1>
          <p className="text-sm text-gray-500">Conteos físicos con ajuste de stock</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventario-fisico"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            title="Configurar stock mínimo y máximo">
            Stock Mín/Máx
          </Link>
          {permissions.canManageProducts && (
            <button onClick={() => setCrearOpen(true)}
              className="rounded-lg bg-[#004A94] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#003570]">
              + Nuevo Inventario
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {sedes.filter(s => s.isActive).length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white outline-none focus:border-[#437EFF]">
            <option value="">Todas las sedes</option>
            {sedes.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        <select value={estado} onChange={e => setEstado(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white outline-none focus:border-[#437EFF]">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e2 => <option key={e2} value={e2}>{ESTADO_INVENTARIO_LABEL[e2]}</option>)}
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-gray-400">Sin inventarios físicos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((inv) => {
            const progreso = inv.totalItems ? Math.round(((inv.itemsContados ?? 0) / inv.totalItems) * 100) : 0;
            return (
              <button key={inv.id} onClick={() => router.push(`/dashboard/inventarios/${inv.id}`)}
                className="rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{inv.nombre}</p>
                    <p className="text-[10px] text-gray-400">
                      {inv.sede?.nombre ?? sedes.find(s => s.id === inv.sedeId)?.nombre ?? ''}
                      {inv.fechaPlanificada && ` · ${new Date(inv.fechaPlanificada).toLocaleDateString('es-PE')}`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${ESTADO_INVENTARIO_COLOR[inv.estado]}`}>
                    {ESTADO_INVENTARIO_LABEL[inv.estado]}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{inv.itemsContados ?? 0}/{inv.totalItems ?? 0} contados</span>
                    {(inv.itemsConDiferencia ?? 0) > 0 && <span className="text-amber-600">{inv.itemsConDiferencia} con diferencia</span>}
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-[#437EFF]" style={{ width: `${progreso}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Crear */}
      {crearOpen && (
        <CrearInventarioDialog
          sedes={sedes.filter(s => s.isActive).map(s => ({ id: s.id, nombre: s.nombre }))}
          onCreated={(inv) => { setCrearOpen(false); router.push(`/dashboard/inventarios/${inv.id}`); }}
          onClose={() => setCrearOpen(false)}
        />
      )}
    </div>
  );
}

function CrearInventarioDialog({ sedes, onCreated, onClose }: {
  sedes: Array<{ id: string; nombre: string }>;
  onCreated: (inv: Inventario) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoInventario>('COMPLETO');
  const [sedeId, setSedeId] = useState(sedes[0]?.id ?? '');
  const [fecha, setFecha] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!nombre.trim()) { setError('El nombre es requerido'); return; }
    if (!sedeId) { setError('Selecciona la sede'); return; }
    setIsSubmitting(true);
    try {
      const inv = await inventarioService.crearInventario({
        nombre: nombre.trim(),
        tipoInventario: tipo,
        sedeId,
        fechaPlanificada: new Date(`${fecha}T12:00:00`).toISOString(),
        incluirTodosProductos: true,
        descripcion: descripcion.trim() || undefined,
      });
      onCreated(inv);
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al crear el inventario');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Nuevo inventario físico</h3>
        <div className="mt-3 space-y-3">
          <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (ej: Inventario Junio 2026) *" />
          <select className={selectClass} value={tipo} onChange={e => setTipo(e.target.value as TipoInventario)}>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className={selectClass} value={sedeId} onChange={e => setSedeId(e.target.value)}>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-gray-500">Fecha planificada</label>
            <input className={inputClass} type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <textarea className={`${inputClass} min-h-[50px]`} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción (opcional)" />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
