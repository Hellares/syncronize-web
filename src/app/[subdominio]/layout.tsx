import { SesionTiendaProvider } from '@/components/tienda/compra/SesionTienda';
import { CursorTienda } from '@/components/tienda/CursorTienda';
import { getEmpresaBySubdominio } from '@/lib/api';
import { coloresTienda } from '@/lib/tienda';
import type { Empresa } from '@/lib/types';

/** Toda la tienda (portada, producto, carrito, pedidos) comparte la sesión del comprador y el cursor. */
export default async function TiendaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdominio: string }>;
}) {
  const { subdominio } = await params;
  // La misma petición que hace cada página (Next la reutiliza). Si falla, la
  // página se encarga del 404: acá solo se pierde el cursor.
  let empresa: Empresa | null = null;
  try {
    empresa = await getEmpresaBySubdominio(subdominio) as Empresa;
  } catch { /* sin cursor */ }
  const cursor = empresa?.personalizaciones?.[0]?.webConfig?.cursor;

  return (
    <SesionTiendaProvider subdominio={subdominio}>
      {cursor && <CursorTienda config={cursor} primario={coloresTienda(empresa).primario} />}
      {children}
    </SesionTiendaProvider>
  );
}
