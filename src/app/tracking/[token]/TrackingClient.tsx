'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const POLL_MS = 10_000;

interface TrackingData {
  codigo: string | null;
  estado: 'SOLICITADO' | 'TOMADO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';
  costoDelivery: string | number;
  creadoEn: string | null;
  tomadoEn: string | null;
  enCaminoEn: string | null;
  entregadoEn: string | null;
  canceladoEn: string | null;
  posicion: { lat: number; lon: number; en: string | null } | null;
  destino: { lat: number; lon: number } | null;
  pinEntrega: string | null;
}

const PASOS: {
  clave: keyof TrackingData;
  titulo: string;
  detalle: string;
}[] = [
  { clave: 'creadoEn', titulo: 'Pedido confirmado', detalle: 'Tu pedido está pagado y listo para salir' },
  { clave: 'tomadoEn', titulo: 'Repartidor asignado', detalle: 'Un repartidor tomó tu pedido' },
  { clave: 'enCaminoEn', titulo: 'En camino', detalle: 'Tu pedido va hacia tu dirección' },
  { clave: 'entregadoEn', titulo: 'Entregado', detalle: '¡Disfrútalo! Gracias por tu compra' },
];

function horaLocal(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function TrackingClient({ token }: { token: string }) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [cargando, setCargando] = useState(true);

  const mapaRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const mapaDivRef = useRef<HTMLDivElement | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/delivery-local/tracking/${token}`, {
        cache: 'no-store',
      });
      if (res.status === 404) {
        setNoEncontrado(true);
        return;
      }
      if (!res.ok) return; // error transitorio: el próximo poll reintenta
      setData((await res.json()) as TrackingData);
    } catch {
      // sin red → el próximo poll reintenta
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
    const timer = setInterval(cargar, POLL_MS);
    return () => clearInterval(timer);
  }, [cargar]);

  // Mapa Leaflet/OSM: se monta cuando hay posición y se actualiza en cada
  // poll moviendo el marcador (sin recrear el mapa).
  useEffect(() => {
    const pos = data?.posicion;
    if (!pos || !mapaDivRef.current) {
      if (mapaRef.current) {
        mapaRef.current.remove();
        mapaRef.current = null;
        markerRef.current = null;
      }
      return;
    }
    let cancelado = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelado || !mapaDivRef.current) return;

      // Moto AZUL de la marca (SVG "two_wheeler" de Material, SIN círculo):
      // halo blanco por drop-shadow para que contraste sobre el mapa.
      const icono = L.divIcon({
        html:
          '<div style="filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff) ' +
          'drop-shadow(0 2px 3px rgba(0,0,0,.35))">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" ' +
          'viewBox="0 0 24 24" fill="#004A94"><path d="M19.44 9.03 15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h1.65l2.77-2.77c-.21.54-.32 1.14-.32 1.77 0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.65-1.97-4.77-4.56-4.97zM7.82 15C7.4 16.15 6.28 17 5 17c-1.63 0-3-1.37-3-3s1.37-3 3-3c1.28 0 2.4.85 2.82 2H5v2h2.82zM19 17c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg></div>',
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (!mapaRef.current) {
        const mapa = L.map(mapaDivRef.current).setView([pos.lat, pos.lon], 16);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(mapa);
        markerRef.current = L.marker([pos.lat, pos.lon], { icon: icono }).addTo(mapa);
        if (data?.destino) {
          L.marker([data.destino.lat, data.destino.lon], {
            icon: L.divIcon({
              html: '<div style="font-size:28px;line-height:1">📍</div>',
              className: '',
              iconSize: [28, 28],
              iconAnchor: [14, 26],
            }),
          }).addTo(mapa);
        }
        mapaRef.current = mapa;
        // El contenedor usa alturas por viewport (50vh/65vh): asegurar que
        // Leaflet mida el tamaño real ya pintado.
        setTimeout(() => mapaRef.current?.invalidateSize(), 150);
      } else {
        markerRef.current?.setLatLng([pos.lat, pos.lon]);
        mapaRef.current.panTo([pos.lat, pos.lon]);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [data]);

  if (cargando) {
    return (
      <ShellAngosto>
        <p className="text-center text-sm text-zinc-500 py-16">Cargando seguimiento…</p>
      </ShellAngosto>
    );
  }

  if (noEncontrado || !data) {
    return (
      <ShellAngosto>
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-zinc-600">
            No encontramos este seguimiento.
            <br />
            Verifica el link que te enviaron por WhatsApp.
          </p>
        </div>
      </ShellAngosto>
    );
  }

  const cancelado = data.estado === 'CANCELADO';
  const conMapa = !cancelado && !!data.posicion;

  return (
    <main className="min-h-screen bg-zinc-50 flex justify-center px-3 py-4 md:py-8">
      <div className={`w-full ${conMapa ? 'max-w-5xl' : 'max-w-md'}`}>
        <Cabecera codigo={data.codigo} />

        {cancelado ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
              Este delivery fue cancelado. Si tienes dudas, escríbenos por WhatsApp.
            </div>
            <PiePagina />
          </div>
        ) : conMapa ? (
          // ── CON MAPA: protagonista. Celular: mapa 50% de la pantalla y
          // timeline abajo; PC: mapa grande a la izquierda, timeline al lado.
          <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
            <div>
              <div
                ref={mapaDivRef}
                className="h-[50vh] md:h-[65vh] w-full rounded-xl border border-zinc-200 overflow-hidden"
              />
              <p className="text-[10px] text-zinc-400 text-center mt-1">
                Posición del repartidor · se actualiza cada 10 s
              </p>
            </div>
            <div className="mt-4 md:mt-0 bg-white rounded-2xl shadow-sm border border-zinc-100 p-5 h-fit">
              <PinEntrega data={data} />
              <Timeline data={data} />
              <AvisoTarifa data={data} />
              <PiePagina />
            </div>
          </div>
        ) : (
          // ── SIN MAPA (aún no sale / ya entregado): card angosta clásica.
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
            <PinEntrega data={data} />
            <Timeline data={data} />
            <AvisoTarifa data={data} />
            <PiePagina />
          </div>
        )}
      </div>
    </main>
  );
}

function Cabecera({ codigo }: { codigo: string | null }) {
  return (
    <div className="text-center mb-4">
      <h1 className="text-base font-bold text-[#004A94]">
        🛵 Seguimiento de tu pedido
      </h1>
      {codigo && <p className="text-xs text-zinc-500 mt-0.5">{codigo}</p>}
    </div>
  );
}

function Timeline({ data }: { data: TrackingData }) {
  const pasoActivo = PASOS.reduce((acc, p, i) => (data[p.clave] ? i : acc), 0);
  return (
    <ol className="space-y-0">
      {PASOS.map((paso, i) => {
        const hecho = !!data[paso.clave];
        const activo = i === pasoActivo && !data.entregadoEn;
        return (
          <li key={paso.clave} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  hecho ? 'bg-green-500 text-white' : 'bg-zinc-200 text-zinc-400'
                } ${activo ? 'ring-4 ring-green-100' : ''}`}
              >
                {hecho ? '✓' : i + 1}
              </div>
              {i < PASOS.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-6 ${
                    data[PASOS[i + 1].clave] ? 'bg-green-500' : 'bg-zinc-200'
                  }`}
                />
              )}
            </div>
            <div className="pb-5">
              <p
                className={`text-sm font-semibold ${
                  hecho ? 'text-zinc-800' : 'text-zinc-400'
                }`}
              >
                {paso.titulo}
                {hecho && (
                  <span className="ml-2 text-[10px] font-normal text-zinc-400">
                    {horaLocal(data[paso.clave] as string | null)}
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-500">{paso.detalle}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PinEntrega({ data }: { data: TrackingData }) {
  if (!data.pinEntrega) return null;
  return (
    <div className="mb-4 rounded-xl border-2 border-[#004A94] bg-blue-50 px-4 py-3 text-center">
      <p className="text-[11px] font-semibold text-[#004A94] mb-1">
        🔐 TU CÓDIGO DE ENTREGA
      </p>
      <p className="text-3xl font-black tracking-[0.3em] text-[#004A94]">
        {data.pinEntrega}
      </p>
      <p className="text-[10px] text-zinc-500 mt-1">
        Dáselo al repartidor SOLO al recibir tu pedido
      </p>
    </div>
  );
}

function AvisoTarifa({ data }: { data: TrackingData }) {
  const costo = Number(data.costoDelivery) || 0;
  if (costo <= 0 || data.entregadoEn) return null;
  return (
    <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800 text-center">
      Al recibir tu pedido, paga <b>S/ {costo.toFixed(2)}</b> del delivery al
      repartidor. Tu producto ya está pagado ✅
    </div>
  );
}

function PiePagina() {
  return (
    <p className="text-[10px] text-zinc-400 text-center mt-6">
      Powered by Syncronize
    </p>
  );
}

function ShellAngosto({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-50 flex justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 h-fit">
        {children}
      </div>
    </main>
  );
}
