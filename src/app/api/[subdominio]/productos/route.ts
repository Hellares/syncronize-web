import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdominio: string }> }
) {
  const { subdominio } = await params;
  const searchParams = request.nextUrl.searchParams.toString();

  const res = await fetch(
    `${API_URL}/marketplace/empresas/${subdominio}/productos${searchParams ? `?${searchParams}` : ''}`,
    { cache: 'no-store' }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
