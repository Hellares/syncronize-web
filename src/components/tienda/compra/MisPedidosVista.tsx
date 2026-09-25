'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ETIQUETA_ESTADO, Pedido, mkt, soles } from '@/lib/tienda-compra';
import { TiendaColors } from '@/lib/colors';
import { useSesionTienda } from './SesionTienda';
import { Cargando, PedirIngreso } from './CarritoVista';

/** Los pedidos del comprador EN ESTA tienda (su cuenta puede tener de otras). */
export function MisPedidosVista({ colors }: { colors: TiendaColors }) {
  const { subdominio, usuario } = useSesionTienda();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    mkt<{ data: Pedido[] }>('/mis-pedidos?limit=50')
      .then((r) => { if (vivo) setPedidos(r.data.filter((p) => p.empresa?.subdominio === subdominio)); })
      .catch((e) => { if (vivo) setError(e instanceof Error ? e.message : 'No se pudieron cargar tus pedidos'); });
    return () => { vivo = false; };
  }, [usuario, subdominio]);

  if (usuario === undefined) return <Cargando />;
  if (!usuario) return <PedirIngreso texto="Ingresa para ver tus pedidos." colors={colors} />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!pedidos) return <Cargando />;

  if (pedidos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <p className="text-gray-600 mb-4">Todavía no hiciste pedidos en esta tienda.</p>
        <Link href={`/${subdominio}`} className="text-sm font-medium underline" style={{ color: colors.primario }}>Ver productos</Link>
      </div>
    );
  }

  return (
    <ul className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
      {pedidos.map((p) => {
        const e = ETIQUETA_ESTADO[p.estado];
        return (
          <li key={p.id}>
            <Link href={`/${subdominio}/pedido/${p.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{p.codigo}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(p.creadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' })}
                  {' · '}{p.detalles?.length ?? 0} producto{(p.detalles?.length ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-gray-900">{soles(p.total)}</p>
                <span className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${e.clase}`}>{e.texto}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
