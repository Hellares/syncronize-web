'use client';

import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import type { ClientePersona, CreateClienteDto, UpdateClienteDto } from '@/core/types/cliente';
import * as personaService from '../services/cliente-persona-service';
import { consultarDni } from '@/features/cotizacion/services/cliente-service';

interface Props {
  isOpen: boolean;
  cliente?: ClientePersona | null; // null/undefined = crear
  onSuccess: (msg: string) => void;
  onClose: () => void;
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

export default function ClientePersonaFormDialog({ isOpen, cliente, onSuccess, onClose }: Props) {
  const esEdicion = !!cliente;

  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [provincia, setProvincia] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [dniMsg, setDniMsg] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(''); setDniMsg('');
    if (cliente) {
      setDni(cliente.dni ?? '');
      setNombres(cliente.nombres ?? '');
      setApellidos(cliente.apellidos ?? '');
      setTelefono(cliente.telefono ?? '');
      setEmail(cliente.email ?? '');
      setDireccion(cliente.direccion ?? '');
      setDistrito(cliente.distrito ?? '');
      setProvincia(cliente.provincia ?? '');
      setDepartamento(cliente.departamento ?? '');
      setIsActive(cliente.isActive);
    } else {
      setDni(''); setNombres(''); setApellidos(''); setTelefono(''); setEmail('');
      setDireccion(''); setDistrito(''); setProvincia(''); setDepartamento(''); setIsActive(true);
    }
  }, [isOpen, cliente]);

  const buscarDni = async (valor: string) => {
    if (!/^\d{8}$/.test(valor)) return;
    setBuscandoDni(true);
    setDniMsg('');
    try {
      const r = await consultarDni(valor);
      setNombres(r.nombres ?? '');
      setApellidos([r.apellidoPaterno, r.apellidoMaterno].filter(Boolean).join(' ') || (r.nombreCompleto ?? ''));
      if (r.direccion) setDireccion(r.direccion);
      if (r.distrito) setDistrito(r.distrito);
      if (r.provincia) setProvincia(r.provincia);
      if (r.departamento) setDepartamento(r.departamento);
      setDniMsg(`✓ ${r.nombreCompleto ?? 'Datos encontrados'}`);
    } catch {
      setDniMsg('No se encontraron datos para ese DNI');
    } finally {
      setBuscandoDni(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!esEdicion && !/^\d{8}$/.test(dni)) { setError('El DNI debe tener 8 dígitos'); return; }
    if (!nombres.trim() || !apellidos.trim()) { setError('Nombres y apellidos son obligatorios'); return; }
    if (!esEdicion && !/^\d{9}$/.test(telefono)) { setError('El teléfono debe tener 9 dígitos'); return; }

    setIsSubmitting(true);
    try {
      if (esEdicion && cliente) {
        const dto: UpdateClienteDto = {
          nombres: nombres.trim(), apellidos: apellidos.trim(),
          telefono: telefono.trim() || undefined, email: email.trim() || undefined,
          direccion: direccion.trim() || undefined, distrito: distrito.trim() || undefined,
          provincia: provincia.trim() || undefined, departamento: departamento.trim() || undefined,
          isActive,
        };
        await personaService.updateCliente(cliente.id, dto);
        onSuccess('Cliente actualizado');
      } else {
        const dto: CreateClienteDto = {
          dni, nombres: nombres.trim(), apellidos: apellidos.trim(), telefono: telefono.trim(),
          email: email.trim() || undefined, direccion: direccion.trim() || undefined,
          distrito: distrito.trim() || undefined, provincia: provincia.trim() || undefined,
          departamento: departamento.trim() || undefined,
        };
        const r = await personaService.createCliente(dto);
        onSuccess(r.mensaje || 'Cliente registrado');
      }
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{esEdicion ? 'Editar cliente' : 'Nuevo cliente (persona)'}</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className={labelClass}>DNI *</label>
            <div className="relative">
              <input className={inputClass} value={dni} disabled={esEdicion} maxLength={8}
                onChange={e => { const v = e.target.value.replace(/\D/g, ''); setDni(v); if (v.length === 8) buscarDni(v); }}
                placeholder="12345678" />
              {buscandoDni && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">RENIEC...</span>}
            </div>
            {dniMsg && <p className={`mt-0.5 text-[11px] ${dniMsg.startsWith('✓') ? 'text-green-600' : 'text-amber-600'}`}>{dniMsg}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Nombres *</label><input className={inputClass} value={nombres} onChange={e => setNombres(e.target.value)} /></div>
            <div><label className={labelClass}>Apellidos *</label><input className={inputClass} value={apellidos} onChange={e => setApellidos(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Teléfono {esEdicion ? '' : '*'}</label><input className={inputClass} value={telefono} maxLength={9} onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))} placeholder="987654321" /></div>
            <div><label className={labelClass}>Email</label><input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <div><label className={labelClass}>Dirección</label><input className={inputClass} value={direccion} onChange={e => setDireccion(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelClass}>Distrito</label><input className={inputClass} value={distrito} onChange={e => setDistrito(e.target.value)} /></div>
            <div><label className={labelClass}>Provincia</label><input className={inputClass} value={provincia} onChange={e => setProvincia(e.target.value)} /></div>
            <div><label className={labelClass}>Departamento</label><input className={inputClass} value={departamento} onChange={e => setDepartamento(e.target.value)} /></div>
          </div>
          {esEdicion && (
            <label className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Activo</span>
              <input type="checkbox" className="h-5 w-5 accent-[#437EFF]" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            </label>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5"><p className="text-xs text-red-600">{error}</p></div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
