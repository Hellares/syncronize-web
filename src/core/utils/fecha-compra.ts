/**
 * Fecha de una compra, con HORA cuando la compra la tiene.
 *
 * 🔴 Las compras cargadas desde la web antes de que el formulario pidiera la
 * hora se guardaron a MEDIANOCHE UTC: el input era `type="date"` y mandaba
 * "2026-09-10" a secas, que `new Date()` interpreta como medianoche UTC.
 *
 * Mostrar eso en hora local las corre UN DIA PARA ATRAS —medianoche UTC son
 * las 19:00 del dia anterior en Lima— y encima inventa una hora que nadie
 * eligio. Por eso esas se leen en UTC y sin hora: es el dia que el usuario
 * marco, sin agregarle una precision que no existe.
 *
 * Las que si traen hora (las del app, que siempre mando el instante completo,
 * y las nuevas de la web) se muestran en hora LOCAL, que es cuando de verdad
 * llego la mercaderia.
 */

/** La compra se cargo con `type="date"`: no hay hora que mostrar. */
export function compraSinHora(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0
  );
}

/** Solo el dia: "10/09/2026". */
export function fmtFechaCompra(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(compraSinHora(iso) ? { timeZone: 'UTC' } : {}),
  });
}

/** El dia y, si la compra la tiene, la hora: "10/09/2026 14:30". */
export function fmtFechaHoraCompra(iso?: string | null): string {
  if (!iso) return '—';
  if (compraSinHora(iso)) return fmtFechaCompra(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${fmtFechaCompra(iso)} ${d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}

/**
 * El valor de un `<input type="datetime-local">`, que se escribe y se lee en
 * hora LOCAL: "2026-09-10T14:30".
 */
export function aInputDateTimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
