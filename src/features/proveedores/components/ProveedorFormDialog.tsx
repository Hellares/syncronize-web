'use client';

import { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import type { Proveedor, CreateProveedorDto, TipoDocumentoIdentidad, TerminosPago } from '@/core/types/proveedor';
import { crearProveedor, actualizarProveedor } from '@/features/proveedores/services/proveedor-service';
import { consultarRuc, consultarDni } from '@/features/cotizacion/services/cliente-service';

interface Props {
  isOpen: boolean;
  proveedor?: Proveedor | null; // null/undefined = crear
  onSuccess: (msg: string, p?: Proveedor) => void;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20';
const labelClass = 'mb-1 block text-xs font-medium text-gray-600';

const TIPOS_DOC: TipoDocumentoIdentidad[] = ['RUC', 'DNI', 'CARNET_EXTRANJERIA', 'PASAPORTE', 'OTROS'];
const TERMINOS: TerminosPago[] = [
  'CONTADO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45', 'CREDITO_60', 'CREDITO_90', 'PERSONALIZADO',
];

export default function ProveedorFormDialog({ isOpen, proveedor, onSuccess, onClose }: Props) {
  const esEdicion = !!proveedor;
  const [nombre, setNombre] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoIdentidad>('RUC');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [terminosPago, setTerminosPago] = useState<TerminosPago>('CONTADO');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscandoDoc, setBuscandoDoc] = useState(false);
  const [docMsg, setDocMsg] = useState('');

  /**
   * Trae el nombre desde SUNAT (11 digitos) o RENIEC (8) al terminar de
   * escribir el documento. Es el mismo lookup del dialogo de cliente.
   *
   * Solo PISA el nombre si esta vacio o si lo habia puesto el lookup anterior:
   * un nombre tecleado a mano no se toca. La direccion se completa solo si
   * estaba vacia, por lo mismo.
   */
  const buscarDoc = useCallback(async (tipo: TipoDocumentoIdentidad, valor: string) => {
    const doc = valor.trim();
    const esRuc = tipo === 'RUC' && /^\d{11}$/.test(doc);
    const esDni = tipo === 'DNI' && /^\d{8}$/.test(doc);
    if (!esRuc && !esDni) return;
    setBuscandoDoc(true);
    setDocMsg('');
    try {
      if (esRuc) {
        const r = await consultarRuc(doc);
        setNombre((prev) => prev.trim() ? prev : r.razonSocial);
        setDireccion((prev) => prev.trim() ? prev : (r.direccionCompleta || r.direccion || ''));
        setDocMsg(`✓ ${r.razonSocial}${r.estado ? ` · ${r.estado}` : ''}`);
      } else {
        const r = await consultarDni(doc);
        const completo = r.nombreCompleto
          ?? [r.nombres, r.apellidoPaterno, r.apellidoMaterno].filter(Boolean).join(' ');
        setNombre((prev) => prev.trim() ? prev : completo);
        setDocMsg(`✓ ${completo || 'Datos encontrados'}`);
      }
    } catch {
      setDocMsg('No se encontraron datos para ese documento');
    } finally {
      setBuscandoDoc(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setNombre(proveedor?.nombre ?? '');
    setTipoDocumento(proveedor?.tipoDocumento ?? 'RUC');
    setNumeroDocumento(proveedor?.numeroDocumento ?? '');
    setNombreComercial(proveedor?.nombreComercial ?? '');
    setEmail(proveedor?.email ?? '');
    setTelefono(proveedor?.telefono ?? '');
    setDireccion(proveedor?.direccion ?? '');
    setTerminosPago(proveedor?.terminosPago ?? 'CONTADO');
    setNotas(proveedor?.notas ?? '');
    setDocMsg('');
  }, [isOpen, proveedor]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!nombre.trim()) return setError('El nombre es obligatorio');
    if (!numeroDocumento.trim()) return setError('El número de documento es obligatorio');
    setGuardando(true);
    setError(null);
    const dto: CreateProveedorDto = {
      nombre: nombre.trim(),
      tipoDocumento,
      numeroDocumento: numeroDocumento.trim(),
      nombreComercial: nombreComercial.trim() || undefined,
      email: email.trim() || undefined,
      telefono: telefono.trim() || undefined,
      direccion: direccion.trim() || undefined,
      terminosPago,
      notas: notas.trim() || undefined,
    };
    try {
      const res = esEdicion
        ? await actualizarProveedor(proveedor!.id, dto)
        : await crearProveedor(dto);
      onSuccess(esEdicion ? 'Proveedor actualizado' : 'Proveedor creado', res);
    } catch (e) {
      const ax = e as AxiosError<{ message?: string | string[] }>;
      const m = ax.response?.data?.message;
      setError(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold text-[#004A94]">
          {esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}
        </h2>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nombre / Razón social *</label>
            <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Tipo doc.</label>
              <select className={inputClass} value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoIdentidad)}>
                {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>
                N° documento *
                {buscandoDoc && <span className="ml-2 font-normal text-gray-400">buscando…</span>}
              </label>
              <input
                className={inputClass}
                value={numeroDocumento}
                inputMode="numeric"
                placeholder={tipoDocumento === 'RUC' ? '20602393365' : tipoDocumento === 'DNI' ? '60412591' : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setNumeroDocumento(v);
                  setDocMsg('');
                  // Se dispara al completar los digitos, sin botón: es el
                  // largo del documento el que dice cuándo está listo.
                  void buscarDoc(tipoDocumento, v);
                }}
                onBlur={() => void buscarDoc(tipoDocumento, numeroDocumento)}
              />
            </div>
          </div>
          {docMsg && (
            <p className={`-mt-1 text-[11px] ${docMsg.startsWith('✓') ? 'text-green-700' : 'text-amber-700'}`}>
              {docMsg}
            </p>
          )}
          <div>
            <label className={labelClass}>Nombre comercial</label>
            <input className={inputClass} value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Dirección</label>
            <input className={inputClass} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Términos de pago</label>
            <select className={inputClass} value={terminosPago} onChange={(e) => setTerminosPago(e.target.value as TerminosPago)}>
              {TERMINOS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea className={inputClass} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={guardando}
            className="rounded-lg bg-[#004A94] px-4 py-2 text-sm font-medium text-white hover:bg-[#003a74] disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
