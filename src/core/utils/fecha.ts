/**
 * Como se leen las fechas en la web.
 *
 * 🔴 Dos formatos, y la diferencia no es cosmetica:
 *
 * - [fmtFechaHora] para un MOMENTO: cuando se hizo la venta, cuando entro el
 *   abono. La hora es un dato real que el usuario necesita para ubicar el
 *   registro entre varios del mismo dia.
 * - [fmtFecha] para un DIA: un vencimiento, un corte de periodo. Ahi la hora es
 *   un artefacto —`fechaVencimientoPago` sale de `fechaVenta + N dias`, asi que
 *   arrastra la hora de la venta— y mostrarla sugiere una precision que nadie
 *   eligio: un credito no vence "a las 02:51".
 */

/** "10 sept, 23:40" — el momento exacto en que paso algo. */
export function fmtFechaHora(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "10 sept 26" — un dia, sin hora. */
export function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

/** "10/09/2026 23:40" — para los PDF, donde el año completo se espera. */
export function fmtFechaHoraLarga(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('es-PE')} ${d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}
