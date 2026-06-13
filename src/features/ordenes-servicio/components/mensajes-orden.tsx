'use client';

// Chat de la orden de servicio (lado staff). Paridad con MensajesOrdenWidget de Flutter:
// los mensajes del cliente (esCliente=true) van a la izquierda; los del equipo, a la derecha.
// El backend marca como leídos los mensajes del cliente al listar (GET /:id/mensajes).

import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import { AxiosError } from 'axios';
import type { MensajeServicio } from '@/core/types/orden-servicio';
import * as osService from '@/features/ordenes-servicio/services/orden-servicio-service';

function fmtHora(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  return d.toLocaleString('es-PE', mismoDia
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function nombreEmisor(m: MensajeServicio): string {
  const p = m.usuario?.persona;
  const nombre = p ? [p.nombres, p.apellidos].filter(Boolean).join(' ') : '';
  return nombre || (m.esCliente ? 'Cliente' : 'Equipo');
}

export function MensajesOrden({ ordenId }: { ordenId: string }) {
  const [mensajes, setMensajes] = useState<MensajeServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await osService.getMensajes(ordenId);
      setMensajes(data);
      setError('');
    } catch {
      setError('No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Auto-scroll al final cuando cambian los mensajes.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensajes]);

  const enviar = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const nuevo = await osService.enviarMensaje(ordenId, contenido);
      setMensajes(prev => [...prev, nuevo]);
      setTexto('');
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(typeof msg === 'string' ? msg : 'No se pudo enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-gray-400">Mensajes con el cliente</p>
        <button onClick={() => { setLoading(true); cargar(); }} className="text-[11px] font-semibold text-[#437EFF] hover:underline">
          Actualizar
        </button>
      </div>

      <div ref={scrollRef} className="max-h-72 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" /></div>
        ) : mensajes.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">No hay mensajes aún. Escribe para iniciar la conversación.</p>
        ) : (
          mensajes.map(m => {
            const mio = !m.esCliente; // el equipo/empresa a la derecha
            return (
              <div key={m.id} className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                  mio ? 'rounded-br-sm bg-[#437EFF] text-white' : 'rounded-bl-sm border border-gray-200 bg-white text-gray-800'}`}>
                  <p className={`mb-0.5 text-[10px] font-semibold ${mio ? 'text-blue-100' : 'text-gray-400'}`}>{nombreEmisor(m)}</p>
                  <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                  <p className={`mt-0.5 text-right text-[9px] ${mio ? 'text-blue-100' : 'text-gray-400'}`}>{fmtHora(m.creadoEn)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="mt-2 text-[11px] text-red-500">{error}</p>}

      <div className="mt-2 flex items-center gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe un mensaje..."
          maxLength={1000}
        />
        <button
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          className="rounded-lg bg-[#004A94] px-4 py-2 text-xs font-bold text-white hover:bg-[#003570] disabled:opacity-50">
          {enviando ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
