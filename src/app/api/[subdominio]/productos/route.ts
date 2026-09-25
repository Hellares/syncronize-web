import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdominio: string }> }
) {
  const { subdominio } = await params;
  const searchParams = request.nextUrl.searchParams.toString();

  try {
    const res = await fetch(
      `${API_URL}/marketplace/empresas/${encodeURIComponent(subdominio)}/productos${searchParams ? `?${searchParams}` : ''}`,
      { cache: 'no-store' }
    );
    // El status del backend pasa tal cual: con un 200 fijo, un error llegaba
    // al navegador como una lista vacía y la tienda decía "no hay productos".
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: 'No se pudo consultar la tienda' }, { status: 502 });
  }
}
