'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import * as clienteService from '../services/cliente-service';
import type { ClienteEmpresa } from '@/core/types/cliente-empresa';
import { useEmpresa } from '@/features/empresa/context/empresa-context';

// ─── Types ───────────────────────────────────────────────────────────────────

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

type TipoDocBusqueda = 'RUC' | 'DNI';

// ─── Styles ──────────────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004A94] focus:outline-none focus:ring-1 focus:ring-[#004A94] transition-colors';

const BTN_PRIMARY_CLS =
  'inline-flex items-center justify-center rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003672] disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const BTN_OUTLINE_CLS =
  'inline-flex items-center justify-center rounded-lg border border-[#004A94] px-4 py-2 text-sm font-medium text-[#004A94] hover:bg-[#004A94]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const LABEL_CLS = 'block text-sm font-medium text-gray-700 mb-1';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClienteSelector({
  onClienteSelected,
  initialNombre = '',
  initialDocumento = '',
}: ClienteSelectorProps) {
  const { empresa } = useEmpresa();
  const empresaId = empresa?.id || '';

  // ── Search existing clients ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof clienteService.buscarClientes>>>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── Document lookup ──────────────────────────────────────────────────────
  const [tipoDocBusqueda, setTipoDocBusqueda] = useState<TipoDocBusqueda>('RUC');
  const [numeroBusqueda, setNumeroBusqueda] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // ── Client data fields ───────────────────────────────────────────────────
  const [clienteId, setClienteId] = useState<string | undefined>(undefined);
  const [nombre, setNombre] = useState(initialNombre);
  const [documento, setDocumento] = useState(initialDocumento);
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  // ── Registration state ───────────────────────────────────────────────────
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // ── Notify parent whenever data changes ──────────────────────────────────
  const notifyParent = useCallback(
    (overrides?: {
      clienteId?: string;
      nombre?: string;
      documento?: string;
      email?: string;
      telefono?: string;
      direccion?: string;
    }) => {
      onClienteSelected({
        clienteId: overrides?.clienteId ?? clienteId,
        nombreCliente: overrides?.nombre ?? nombre,
        documentoCliente: overrides?.documento ?? documento,
        emailCliente: overrides?.email ?? email,
        telefonoCliente: overrides?.telefono ?? telefono,
        direccionCliente: overrides?.direccion ?? direccion,
      });
    },
    [onClienteSelected, clienteId, nombre, documento, email, telefono, direccion],
  );

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Debounced search ─────────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

      if (value.length < 2 || !empresaId) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      searchTimerRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const results = await clienteService.buscarClientes(empresaId, value);
          setSearchResults(results);
          setShowResults(true);
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [empresaId],
  );

  // ── Select an existing client ────────────────────────────────────────────
  const handleSelectCliente = useCallback(
    (cliente: { id: string; tipo: string; nombre: string; documento: string; email?: string; telefono?: string; direccion?: string }) => {
      setClienteId(cliente.id);
      setNombre(cliente.nombre);
      setDocumento(cliente.documento);
      setEmail(cliente.email || '');
      setTelefono(cliente.telefono || '');
      setDireccion(cliente.direccion || '');
      setShowResults(false);
      setSearchQuery('');
      setRegisterSuccess(false);
      setRegisterError('');

      onClienteSelected({
        clienteId: cliente.id,
        nombreCliente: cliente.nombre,
        documentoCliente: cliente.documento,
        emailCliente: cliente.email || '',
        telefonoCliente: cliente.telefono || '',
        direccionCliente: cliente.direccion || '',
      });
    },
    [onClienteSelected],
  );

  // ── RUC / DNI lookup ─────────────────────────────────────────────────────
  const handleDocLookup = useCallback(async () => {
    const num = numeroBusqueda.trim();
    if (!num) return;

    if (tipoDocBusqueda === 'RUC' && num.length !== 11) {
      setLookupError('El RUC debe tener 11 digitos');
      return;
    }
    if (tipoDocBusqueda === 'DNI' && num.length !== 8) {
      setLookupError('El DNI debe tener 8 digitos');
      return;
    }

    setLookingUp(true);
    setLookupError('');

    try {
      if (tipoDocBusqueda === 'RUC') {
        const result = await clienteService.consultarRuc(num);
        setClienteId(undefined);
        setNombre(result.razonSocial);
        setDocumento(result.ruc);
        setDireccion(result.direccionCompleta || result.direccion || '');
        setEmail('');
        setTelefono('');
        setRegisterSuccess(false);

        onClienteSelected({
          clienteId: undefined,
          nombreCliente: result.razonSocial,
          documentoCliente: result.ruc,
          emailCliente: '',
          telefonoCliente: '',
          direccionCliente: result.direccionCompleta || result.direccion || '',
        });
      } else {
        const result = await clienteService.consultarDni(num);
        setClienteId(undefined);
        setNombre(result.nombreCompleto);
        setDocumento(result.dni);
        setDireccion(result.direccionCompleta || result.direccion || '');
        setEmail('');
        setTelefono('');
        setRegisterSuccess(false);

        onClienteSelected({
          clienteId: undefined,
          nombreCliente: result.nombreCompleto,
          documentoCliente: result.dni,
          emailCliente: '',
          telefonoCliente: '',
          direccionCliente: result.direccionCompleta || result.direccion || '',
        });
      }
    } catch {
      setLookupError(
        tipoDocBusqueda === 'RUC'
          ? 'No se encontraron datos para el RUC ingresado'
          : 'No se encontraron datos para el DNI ingresado',
      );
    } finally {
      setLookingUp(false);
    }
  }, [tipoDocBusqueda, numeroBusqueda, onClienteSelected]);

  // ── Register as client ───────────────────────────────────────────────────
  const handleRegister = useCallback(async () => {
    if (!empresaId || !nombre.trim() || !documento.trim()) return;

    setRegistering(true);
    setRegisterError('');
    setRegisterSuccess(false);

    try {
      const created = await clienteService.createCliente(empresaId, {
        razonSocial: nombre.trim(),
        tipoDocumento: documento.length === 11 ? 'RUC' : documento.length === 8 ? 'DNI' : 'OTRO',
        numeroDocumento: documento.trim(),
        email: email.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
      });

      setClienteId(created.id);
      setRegisterSuccess(true);

      onClienteSelected({
        clienteId: created.id,
        nombreCliente: nombre,
        documentoCliente: documento,
        emailCliente: email,
        telefonoCliente: telefono,
        direccionCliente: direccion,
      });
    } catch {
      setRegisterError('Error al registrar el cliente. Puede que ya exista.');
    } finally {
      setRegistering(false);
    }
  }, [empresaId, nombre, documento, email, telefono, direccion, onClienteSelected]);

  // ── Field change handlers (notify parent on each change) ─────────────────
  const handleFieldChange = useCallback(
    (field: 'nombre' | 'documento' | 'email' | 'telefono' | 'direccion', value: string) => {
      const setters = { nombre: setNombre, documento: setDocumento, email: setEmail, telefono: setTelefono, direccion: setDireccion };
      setters[field](value);
      // If editing manually, clear clienteId (it's no longer a saved client)
      if (clienteId) {
        setClienteId(undefined);
        setRegisterSuccess(false);
      }
      notifyParent({ [field]: value, clienteId: undefined });
    },
    [clienteId, notifyParent],
  );

  // ── Determine if "Register" button should show ───────────────────────────
  const showRegisterBtn = !clienteId && nombre.trim() && documento.trim();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Search existing clients ────────────────────────────────────────── */}
      <div ref={searchContainerRef} className="relative">
        <label className={LABEL_CLS}>Buscar cliente existente</label>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre o documento..."
            className={`${INPUT_CLS} pl-9`}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#004A94]" />
            </div>
          )}
        </div>

        {/* Dropdown results */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            <ul className="max-h-48 overflow-y-auto py-1">
              {searchResults.map((cliente) => (
                <li key={`${cliente.tipo}-${cliente.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectCliente(cliente)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#004A94]/5 transition-colors"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      cliente.tipo === 'empresa' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {cliente.tipo === 'empresa' ? 'E' : 'P'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {cliente.nombre}
                      </p>
                      <p className="text-xs text-gray-500">
                        {cliente.documento.length === 11 ? 'RUC' : 'DNI'}: {cliente.documento}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      cliente.tipo === 'empresa' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {cliente.tipo === 'empresa' ? 'Empresa' : 'Persona'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
            <p className="text-center text-sm text-gray-500">No se encontraron clientes</p>
          </div>
        )}
      </div>

      {/* ── Separator ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400">o buscar por documento</span>
        </div>
      </div>

      {/* ── Document lookup ────────────────────────────────────────────────── */}
      <div>
        <label className={LABEL_CLS}>Consultar documento</label>
        <div className="flex gap-2">
          <select
            value={tipoDocBusqueda}
            onChange={(e) => {
              setTipoDocBusqueda(e.target.value as TipoDocBusqueda);
              setNumeroBusqueda('');
              setLookupError('');
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#004A94] focus:outline-none focus:ring-1 focus:ring-[#004A94]"
          >
            <option value="RUC">RUC</option>
            <option value="DNI">DNI</option>
          </select>
          <input
            type="text"
            inputMode="numeric"
            value={numeroBusqueda}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              const maxLen = tipoDocBusqueda === 'RUC' ? 11 : 8;
              setNumeroBusqueda(val.slice(0, maxLen));
              setLookupError('');
            }}
            placeholder={tipoDocBusqueda === 'RUC' ? '20XXXXXXXXX' : '4XXXXXXX'}
            className={`${INPUT_CLS} flex-1`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDocLookup();
              }
            }}
          />
          <button
            type="button"
            onClick={handleDocLookup}
            disabled={lookingUp || !numeroBusqueda.trim()}
            className={BTN_PRIMARY_CLS}
          >
            {lookingUp ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
        {lookupError && (
          <p className="mt-1.5 text-xs text-red-500">{lookupError}</p>
        )}
      </div>

      {/* ── Client data fields ─────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <h3 className="text-sm font-semibold text-gray-700">Datos del cliente</h3>

        <div>
          <label className={LABEL_CLS}>Nombre / Razon Social *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => handleFieldChange('nombre', e.target.value)}
            placeholder="Nombre o razon social del cliente"
            className={INPUT_CLS}
          />
        </div>

        <div>
          <label className={LABEL_CLS}>Documento</label>
          <input
            type="text"
            value={documento}
            onChange={(e) => handleFieldChange('documento', e.target.value)}
            placeholder="RUC o DNI"
            className={INPUT_CLS}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLS}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Telefono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => handleFieldChange('telefono', e.target.value)}
              placeholder="999 999 999"
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Direccion</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => handleFieldChange('direccion', e.target.value)}
            placeholder="Direccion del cliente"
            className={INPUT_CLS}
          />
        </div>
      </div>

      {/* ── Register button ────────────────────────────────────────────────── */}
      {showRegisterBtn && (
        <div>
          <button
            type="button"
            onClick={handleRegister}
            disabled={registering}
            className={BTN_OUTLINE_CLS}
          >
            {registering ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#004A94] border-t-transparent" />
                Registrando...
              </>
            ) : (
              <>
                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Registrar como cliente
              </>
            )}
          </button>
          {registerError && (
            <p className="mt-1.5 text-xs text-red-500">{registerError}</p>
          )}
        </div>
      )}

      {/* ── Success indicator ──────────────────────────────────────────────── */}
      {registerSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-700">Cliente registrado correctamente</span>
        </div>
      )}

      {/* ── Selected client indicator ──────────────────────────────────────── */}
      {clienteId && !registerSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <svg className="h-4 w-4 text-[#004A94]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm text-[#004A94]">Cliente existente seleccionado</span>
          <button
            type="button"
            onClick={() => {
              setClienteId(undefined);
              setNombre('');
              setDocumento('');
              setEmail('');
              setTelefono('');
              setDireccion('');
              setRegisterSuccess(false);
              notifyParent({
                clienteId: undefined,
                nombre: '',
                documento: '',
                email: '',
                telefono: '',
                direccion: '',
              });
            }}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}
