'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import { apiClient } from '@/core/api/client';
import type { ClientePersona } from '@/core/types/cliente';
import type { ClienteEmpresa } from '@/core/types/cliente-empresa';
import * as personaService from '@/features/clientes/services/cliente-persona-service';
import ClientePersonaFormDialog from '@/features/clientes/components/ClientePersonaFormDialog';
import ClienteEmpresaFormDialog from '@/features/clientes/components/ClienteEmpresaFormDialog';
import { useEmpresa, usePermissions } from '@/features/empresa/context/empresa-context';

type Tab = 'personas' | 'empresas';
const LIMIT = 20;

export default function ClientesPage() {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id ?? '';
  const permissions = usePermissions();
  const puedeGestionar = permissions.canManageClients;

  const [tab, setTab] = useState<Tab>('personas');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [personas, setPersonas] = useState<ClientePersona[]>([]);
  const [empresas, setEmpresas] = useState<ClienteEmpresa[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionMsg, setAccionMsg] = useState('');

  const [personaForm, setPersonaForm] = useState<{ open: boolean; cliente?: ClientePersona | null }>({ open: false });
  const [empresaForm, setEmpresaForm] = useState<{ open: boolean; cliente?: ClienteEmpresa | null }>({ open: false });

  const fetchData = useCallback(async (opts?: { page?: number; search?: string }) => {
    setIsLoading(true);
    setError(null);
    const p = opts?.page ?? page;
    const s = opts?.search ?? search;
    try {
      if (tab === 'personas') {
        const res = await personaService.getClientes({ page: p, limit: LIMIT, search: s || undefined });
        setPersonas(res.data);
        setTotalPages(res.meta.totalPages || 1);
      } else {
        const q = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
        if (s) q.set('search', s);
        const res = await apiClient.get(`/empresas/${empresaId}/clientes-empresa?${q.toString()}`);
        const body = res.data as { data?: ClienteEmpresa[]; totalPages?: number };
        setEmpresas(body.data ?? []);
        setTotalPages(body.totalPages || 1);
      }
    } catch {
      setError('Error al cargar los clientes');
    } finally {
      setIsLoading(false);
    }
  }, [tab, page, search, empresaId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); fetchData({ page: 1 }); }, [tab]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData({ page }); }, [page]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); fetchData({ page: 1, search: q }); }, 400);
  };

  const flash = (m: string) => { setAccionMsg(m); setTimeout(() => setAccionMsg(''), 4000); };

  const eliminarPersona = async (c: ClientePersona) => {
    if (!confirm(`¿Desactivar a ${c.nombreCompleto}?`)) return;
    try {
      await personaService.deleteCliente(c.id);
      flash('Cliente desactivado');
      fetchData();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo desactivar el cliente');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{tab === 'personas' ? 'Personas (DNI)' : 'Empresas (RUC)'}</p>
        </div>
        {puedeGestionar && (
          <button onClick={() => tab === 'personas' ? setPersonaForm({ open: true }) : setEmpresaForm({ open: true })}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-bold text-white hover:bg-[#003570]">
            + Nuevo cliente
          </button>
        )}
      </div>

      {accionMsg && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm text-green-700">{accionMsg}</p></div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['personas', 'empresas'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-[#437EFF] text-[#437EFF]' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'personas' ? 'Personas' : 'Empresas'}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <input
        className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
        value={search} onChange={e => handleSearch(e.target.value)}
        placeholder={tab === 'personas' ? 'Buscar por nombre, DNI, teléfono o email...' : 'Buscar por razón social, RUC o código...'} />

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" /></div>
      ) : tab === 'personas' ? (
        personas.length === 0 ? (
          <div className="py-20 text-center"><p className="text-4xl mb-2">👤</p><p className="text-gray-400">Sin clientes</p></div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase text-gray-400">
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">DNI</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Contacto</th>
                  <th className="px-4 py-2.5">Estado</th>
                  {puedeGestionar && <th className="px-4 py-2.5 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {personas.map(c => (
                  <tr key={c.id} className="hover:bg-[#437EFF]/5">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-gray-900">{c.nombreCompleto}</p>
                      {c.direccion && <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{c.direccion}</p>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{c.dni ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">
                      {c.telefono ?? '—'}{c.email ? <span className="block text-[10px] text-gray-400">{c.email}</span> : ''}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {puedeGestionar && (
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => setPersonaForm({ open: true, cliente: c })} className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">Editar</button>
                        {c.isActive && <button onClick={() => eliminarPersona(c)} className="ml-1 rounded border border-red-200 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50">Desactivar</button>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        empresas.length === 0 ? (
          <div className="py-20 text-center"><p className="text-4xl mb-2">🏢</p><p className="text-gray-400">Sin clientes empresa</p></div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase text-gray-400">
                  <th className="px-4 py-2.5">Razón social</th>
                  <th className="px-4 py-2.5">RUC</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Contacto</th>
                  <th className="px-4 py-2.5">Estado</th>
                  {puedeGestionar && <th className="px-4 py-2.5 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {empresas.map(c => (
                  <tr key={c.id} className="hover:bg-[#437EFF]/5">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-gray-900">{c.razonSocial}</p>
                      {c.nombreComercial && <p className="text-[10px] text-gray-400">{c.nombreComercial}</p>}
                      <p className="text-[9px] text-gray-300 font-mono">{c.codigo}</p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{c.numeroDocumento}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">
                      {c.telefono ?? '—'}{c.email ? <span className="block text-[10px] text-gray-400">{c.email}</span> : ''}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {puedeGestionar && (
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => setEmpresaForm({ open: true, cliente: c })} className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">Editar</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
          <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">Siguiente →</button>
        </div>
      )}

      {/* Diálogos */}
      <ClientePersonaFormDialog
        isOpen={personaForm.open}
        cliente={personaForm.cliente}
        onClose={() => setPersonaForm({ open: false })}
        onSuccess={(msg) => { setPersonaForm({ open: false }); flash(msg); fetchData(); }}
      />
      <ClienteEmpresaFormDialog
        isOpen={empresaForm.open}
        empresaId={empresaId}
        cliente={empresaForm.cliente}
        onClose={() => setEmpresaForm({ open: false })}
        onSuccess={(msg) => { setEmpresaForm({ open: false }); flash(msg); fetchData(); }}
      />
    </div>
  );
}
