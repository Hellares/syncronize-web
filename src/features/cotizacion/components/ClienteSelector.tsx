'use client';

// Selección de cliente para cotizaciones — mismo enfoque que la nueva orden de
// servicio: búsqueda unificada + crear persona/empresa (con lookup RENIEC/SUNAT
// y prefill del DNI/RUC tecleado). Emite los datos denormalizados que la
// cotización necesita (clienteId + nombre/documento/email/teléfono/dirección).

import { useState, useRef, useEffect } from 'react';
import * as clienteService from '../services/cliente-service';
import ClientePersonaFormDialog from '@/features/clientes/components/ClientePersonaFormDialog';
import ClienteEmpresaFormDialog from '@/features/clientes/components/ClienteEmpresaFormDialog';
import type { ClientePersona } from '@/core/types/cliente';
import type { ClienteEmpresa } from '@/core/types/cliente-empresa';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

interface ClienteSelectorProps {
  onClienteSelected: (data: {
    clienteId?: string;
    nombreCliente: string;
    documentoCliente?: string;
    emailCliente?: string;
    telefonoCliente?: string;
    direccionCliente?: string;
  }) => void;
  initialNombre?: string;
  initialDocumento?: string;
}

interface Seleccion {
  clienteId?: string;
  tipo?: 'persona' | 'empresa';
  nombre: string;
  documento: string;
  email: string;
  telefono: string;
  direccion: string;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#004A94] focus:ring-1 focus:ring-[#004A94]/20';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

export default function ClienteSelector({ onClienteSelected, initialNombre = '', initialDocumento = '' }: ClienteSelectorProps) {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id || '';

  const [seleccion, setSeleccion] = useState<Seleccion | null>(
    initialNombre ? { nombre: initialNombre, documento: initialDocumento, email: '', telefono: '', direccion: '' } : null,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [resultados, setResultados] = useState<Awaited<ReturnType<typeof clienteService.buscarClientes>>>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [personaDialog, setPersonaDialog] = useState(false);
  const [empresaDialog, setEmpresaDialog] = useState(false);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const emitir = (s: Seleccion | null) => {
    onClienteSelected({
      clienteId: s?.clienteId,
      nombreCliente: s?.nombre ?? '',
      documentoCliente: s?.documento ?? '',
      emailCliente: s?.email ?? '',
      telefonoCliente: s?.telefono ?? '',
      direccionCliente: s?.direccion ?? '',
    });
  };

  const seleccionar = (s: Seleccion) => {
    setSeleccion(s);
    emitir(s);
    setShowResults(false);
    setSearchQuery('');
  };

  const limpiar = () => {
    setSeleccion(null);
    emitir(null);
  };

  const buscar = (q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2 || !empresaId) { setResultados([]); setShowResults(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await clienteService.buscarClientes(empresaId, q.trim());
        setResultados(res);
        setShowResults(true);
      } catch { setResultados([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const onPersonaCreada = (_msg: string, c?: ClientePersona) => {
    setPersonaDialog(false);
    if (c) seleccionar({
      clienteId: c.id, tipo: 'persona',
      nombre: c.nombreCompleto || [c.nombres, c.apellidos].filter(Boolean).join(' '),
      documento: c.dni ?? '', email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '',
    });
  };
  const onEmpresaCreada = (_msg: string, c?: ClienteEmpresa) => {
    setEmpresaDialog(false);
    if (c) seleccionar({
      clienteId: c.id, tipo: 'empresa',
      nombre: c.nombreComercial || c.razonSocial,
      documento: c.numeroDocumento ?? '', email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '',
    });
  };

  // Si lo buscado son solo dígitos, se lleva al modal como DNI/RUC pre-rellenado.
  const docBuscado = /^\d+$/.test(searchQuery.trim()) ? searchQuery.trim() : '';

  return (
    <div className="space-y-2">
      <label className={labelClass}>Cliente *</label>

      {seleccion ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-green-800">{seleccion.nombre}</p>
              <p className="text-[11px] text-green-700">
                {seleccion.tipo === 'empresa' ? 'Empresa' : seleccion.tipo === 'persona' ? 'Persona' : 'Cliente'}
                {seleccion.documento ? ` · ${seleccion.documento.length === 11 ? 'RUC' : 'DNI'} ${seleccion.documento}` : ''}
              </p>
            </div>
            <button type="button" onClick={limpiar} className="shrink-0 text-xs text-green-600 hover:text-green-800">Cambiar</button>
          </div>
          {(seleccion.telefono || seleccion.email || seleccion.direccion) && (
            <div className="mt-1.5 space-y-0.5 border-t border-green-200/60 pt-1.5 text-[11px] text-green-700">
              {seleccion.telefono && <p><span className="text-green-600/70">Teléfono:</span> {seleccion.telefono}</p>}
              {seleccion.email && <p className="truncate"><span className="text-green-600/70">Email:</span> {seleccion.email}</p>}
              {seleccion.direccion && <p><span className="text-green-600/70">Dirección:</span> {seleccion.direccion}</p>}
            </div>
          )}
        </div>
      ) : (
        <>
          <div ref={containerRef} className="relative">
            <input className={inputClass} value={searchQuery} onChange={e => buscar(e.target.value)}
              placeholder="Buscar cliente por nombre o documento..." />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#004A94]" />}
            {showResults && resultados.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {resultados.map(c => (
                  <button key={`${c.tipo}-${c.id}`} type="button"
                    onClick={() => seleccionar({ clienteId: c.id, tipo: c.tipo as 'persona' | 'empresa', nombre: c.nombre, documento: c.documento ?? '', email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '' })}
                    className="block w-full border-b border-gray-50 px-3 py-2 text-left text-xs hover:bg-[#004A94]/5 last:border-0">
                    <span className={`mr-1 rounded px-1 text-[9px] font-bold ${c.tipo === 'empresa' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>{c.tipo === 'empresa' ? 'E' : 'P'}</span>
                    {c.nombre} <span className="text-gray-400">{c.documento}</span>
                  </button>
                ))}
              </div>
            )}
            {showResults && resultados.length === 0 && searchQuery.trim().length >= 2 && !searching && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                <p className="text-center text-xs text-gray-500">No se encontraron clientes. Créalo abajo.</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPersonaDialog(true)}
              className="flex-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#004A94] hover:text-[#004A94]">+ Nueva persona</button>
            <button type="button" onClick={() => setEmpresaDialog(true)}
              className="flex-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#004A94] hover:text-[#004A94]">+ Nueva empresa</button>
          </div>
          <p className="text-[10px] text-gray-400">Si el cliente no existe, créalo aquí (con búsqueda RENIEC/SUNAT por DNI/RUC).</p>
        </>
      )}

      <ClientePersonaFormDialog isOpen={personaDialog}
        initialDni={docBuscado.length > 0 && docBuscado.length <= 8 ? docBuscado : undefined}
        onClose={() => setPersonaDialog(false)} onSuccess={onPersonaCreada} />
      <ClienteEmpresaFormDialog isOpen={empresaDialog} empresaId={empresaId}
        initialRuc={docBuscado.length > 0 && docBuscado.length <= 11 ? docBuscado : undefined}
        onClose={() => setEmpresaDialog(false)} onSuccess={onEmpresaCreada} />
    </div>
  );
}
