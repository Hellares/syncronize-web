'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { ClienteEmpresa, CreateClienteEmpresaDto } from '@/core/types/cliente-empresa';
import { createCliente, updateCliente, consultarRuc } from '@/features/cotizacion/services/cliente-service';

interface Props {
  isOpen: boolean;
  empresaId: string;
  cliente?: ClienteEmpresa | null; // null/undefined = crear
  initialRuc?: string; // pre-rellena el RUC (al crear desde una búsqueda)
  onSuccess: (msg: string, creado?: ClienteEmpresa) => void;
  onClose: () => void;
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

export default function ClienteEmpresaFormDialog({ isOpen, empresaId, cliente, initialRuc, onSuccess, onClose }: Props) {
  const esEdicion = !!cliente;

  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [provincia, setProvincia] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [rucMsg, setRucMsg] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(''); setRucMsg('');
    if (cliente) {
      setRuc(cliente.numeroDocumento ?? '');
      setRazonSocial(cliente.razonSocial ?? '');
      setNombreComercial(cliente.nombreComercial ?? '');
      setEmail(cliente.email ?? '');
      setTelefono(cliente.telefono ?? '');
      setDireccion(cliente.direccion ?? '');
      setDistrito(cliente.distrito ?? '');
      setProvincia(cliente.provincia ?? '');
      setDepartamento(cliente.departamento ?? '');
    } else {
      setRuc(initialRuc ?? ''); setRazonSocial(''); setNombreComercial(''); setEmail(''); setTelefono('');
      setDireccion(''); setDistrito(''); setProvincia(''); setDepartamento('');
    }
  }, [isOpen, cliente, initialRuc]);

  const buscarRuc = useCallback(async (valor: string) => {
    if (!/^\d{11}$/.test(valor)) return;
    setBuscandoRuc(true);
    setRucMsg('');
    try {
      const r = await consultarRuc(valor);
      setRazonSocial(r.razonSocial ?? '');
      if (r.direccion) setDireccion(r.direccion);
      if (r.distrito) setDistrito(r.distrito);
      if (r.provincia) setProvincia(r.provincia);
      if (r.departamento) setDepartamento(r.departamento);
      setRucMsg(`✓ ${r.razonSocial ?? 'Datos encontrados'}${r.estado ? ` · ${r.estado}` : ''}`);
    } catch {
      setRucMsg('No se encontraron datos para ese RUC');
    } finally {
      setBuscandoRuc(false);
    }
  }, []);

  // Al abrir para crear con un RUC pre-rellenado, dispara el lookup SUNAT.
  useEffect(() => {
    if (isOpen && !cliente && initialRuc && /^\d{11}$/.test(initialRuc)) buscarRuc(initialRuc);
  }, [isOpen, cliente, initialRuc, buscarRuc]);

  const handleSubmit = async () => {
    setError('');
    if (!esEdicion && !/^\d{11}$/.test(ruc)) { setError('El RUC debe tener 11 dígitos'); return; }
    if (!razonSocial.trim()) { setError('La razón social es obligatoria'); return; }

    setIsSubmitting(true);
    try {
      const dto: CreateClienteEmpresaDto = {
        razonSocial: razonSocial.trim(),
        nombreComercial: nombreComercial.trim() || undefined,
        tipoDocumento: 'RUC',
        numeroDocumento: ruc,
        email: email.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        distrito: distrito.trim() || undefined,
        provincia: provincia.trim() || undefined,
        departamento: departamento.trim() || undefined,
      };
      if (esEdicion && cliente) {
        const { numeroDocumento, ...rest } = dto;
        void numeroDocumento; // el RUC no se edita
        await updateCliente(empresaId, cliente.id, rest);
        onSuccess('Cliente empresa actualizado');
      } else {
        const creado = await createCliente(empresaId, dto);
        onSuccess('Cliente empresa registrado', creado);
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
        <h3 className="text-sm font-semibold text-gray-900">{esEdicion ? 'Editar cliente empresa' : 'Nuevo cliente (empresa)'}</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className={labelClass}>RUC *</label>
            <div className="relative">
              <input className={inputClass} value={ruc} disabled={esEdicion} maxLength={11}
                onChange={e => { const v = e.target.value.replace(/\D/g, ''); setRuc(v); if (v.length === 11) buscarRuc(v); }}
                placeholder="20123456789" />
              {buscandoRuc && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">SUNAT...</span>}
            </div>
            {rucMsg && <p className={`mt-0.5 text-[11px] ${rucMsg.startsWith('✓') ? 'text-green-600' : 'text-amber-600'}`}>{rucMsg}</p>}
          </div>
          <div><label className={labelClass}>Razón social *</label><input className={inputClass} value={razonSocial} onChange={e => setRazonSocial(e.target.value)} /></div>
          <div><label className={labelClass}>Nombre comercial</label><input className={inputClass} value={nombreComercial} onChange={e => setNombreComercial(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Teléfono</label><input className={inputClass} value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
            <div><label className={labelClass}>Email</label><input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <div><label className={labelClass}>Dirección</label><input className={inputClass} value={direccion} onChange={e => setDireccion(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelClass}>Distrito</label><input className={inputClass} value={distrito} onChange={e => setDistrito(e.target.value)} /></div>
            <div><label className={labelClass}>Provincia</label><input className={inputClass} value={provincia} onChange={e => setProvincia(e.target.value)} /></div>
            <div><label className={labelClass}>Departamento</label><input className={inputClass} value={departamento} onChange={e => setDepartamento(e.target.value)} /></div>
          </div>
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
