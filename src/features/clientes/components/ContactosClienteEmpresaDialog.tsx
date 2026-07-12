'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { ClienteEmpresa, ClienteEmpresaContacto, CreateContactoDto } from '@/core/types/cliente-empresa';
import * as clienteService from '@/features/cotizacion/services/cliente-service';

interface Props {
  isOpen: boolean;
  empresaId: string;
  cliente: ClienteEmpresa;
  onClose: () => void;
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF]';

/** Gestión de contactos del cliente B2B (paridad app: se usan al crear órdenes de servicio) */
export default function ContactosClienteEmpresaDialog({ isOpen, empresaId, cliente, onClose }: Props) {
  const [contactos, setContactos] = useState<ClienteEmpresaContacto[]>(cliente.contactos ?? []);
  const [editando, setEditando] = useState<ClienteEmpresaContacto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    try {
      const full = await clienteService.getCliente(empresaId, cliente.id);
      setContactos(full.contactos ?? []);
    } catch { /* mantiene lista local */ }
  }, [empresaId, cliente.id]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    clienteService.getCliente(empresaId, cliente.id)
      .then(full => { if (alive) setContactos(full.contactos ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isOpen, empresaId, cliente.id]);

  const eliminar = async (c: ClienteEmpresaContacto) => {
    if (!confirm(`¿Eliminar el contacto ${c.nombre}?`)) return;
    try {
      await clienteService.eliminarContacto(empresaId, cliente.id, c.id);
      recargar();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'No se pudo eliminar el contacto');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Contactos</h3>
            <p className="text-xs text-gray-500">{cliente.razonSocial}</p>
          </div>
          <button onClick={() => { setEditando(null); setFormOpen(true); }}
            className="rounded-lg bg-[#004A94] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#003570]">
            + Agregar
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-3 space-y-2">
          {contactos.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">Sin contactos registrados. Los contactos se usan en órdenes de servicio y cotizaciones B2B.</p>
          ) : contactos.map(c => (
            <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {c.nombre}
                  {c.esPrincipal && <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">PRINCIPAL</span>}
                </p>
                <p className="text-[10px] text-gray-500">
                  {[c.cargo, c.dni && `DNI ${c.dni}`, c.telefono ?? c.telefonoMovil, c.email].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => { setEditando(c); setFormOpen(true); }} title="Editar"
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">✎</button>
                <button onClick={() => eliminar(c)} title="Eliminar"
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">🗑</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>

      {formOpen && (
        <ContactoFormDialog
          empresaId={empresaId}
          clienteEmpresaId={cliente.id}
          contacto={editando}
          onSaved={() => { setFormOpen(false); recargar(); }}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

function ContactoFormDialog({ empresaId, clienteEmpresaId, contacto, onSaved, onClose }: {
  empresaId: string; clienteEmpresaId: string; contacto: ClienteEmpresaContacto | null;
  onSaved: () => void; onClose: () => void;
}) {
  const esEdicion = !!contacto;
  const [nombre, setNombre] = useState(contacto?.nombre ?? '');
  const [cargo, setCargo] = useState(contacto?.cargo ?? '');
  const [dni, setDni] = useState(contacto?.dni ?? '');
  const [telefono, setTelefono] = useState(contacto?.telefono ?? '');
  const [email, setEmail] = useState(contacto?.email ?? '');
  const [esPrincipal, setEsPrincipal] = useState(contacto?.esPrincipal ?? false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setIsSubmitting(true);
    setError('');
    const dto: CreateContactoDto = {
      nombre: nombre.trim(),
      cargo: cargo.trim() || undefined,
      dni: dni.trim() || undefined,
      telefono: telefono.trim() || undefined,
      email: email.trim() || undefined,
      esPrincipal,
    };
    try {
      if (esEdicion && contacto) await clienteService.editarContacto(empresaId, clienteEmpresaId, contacto.id, dto);
      else await clienteService.agregarContacto(empresaId, clienteEmpresaId, dto);
      onSaved();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo guardar el contacto');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">{esEdicion ? 'Editar contacto' : 'Nuevo contacto'}</h3>
        <div className="mt-3 space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Cargo</label>
              <input className={inputClass} value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ej: Logística" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600">DNI</label>
              <input className={inputClass} inputMode="numeric" maxLength={8} value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Teléfono</label>
              <input className={inputClass} inputMode="tel" value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={esPrincipal} onChange={e => setEsPrincipal(e.target.checked)}
              className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
            Contacto principal
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={isSubmitting}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
