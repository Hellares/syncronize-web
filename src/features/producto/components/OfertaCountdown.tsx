'use client';

import { useState, useEffect } from 'react';

interface Props {
  fechaInicio?: string;
  fechaFin?: string;
  enOferta: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function OfertaCountdown({ fechaInicio, fechaFin, enOferta }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [status, setStatus] = useState<'pending' | 'active' | 'expired'>('expired');

  useEffect(() => {
    if (!enOferta) { setStatus('expired'); return; }

    const update = () => {
      const now = Date.now();
      const start = fechaInicio ? new Date(fechaInicio).getTime() : 0;
      const end = fechaFin ? new Date(fechaFin).getTime() : Infinity;

      if (start > now) {
        setStatus('pending');
        setTimeLeft(calcTimeLeft(new Date(start)));
      } else if (end > now) {
        setStatus('active');
        setTimeLeft(end === Infinity ? null : calcTimeLeft(new Date(end)));
      } else {
        setStatus('expired');
        setTimeLeft(null);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [fechaInicio, fechaFin, enOferta]);

  if (status === 'expired') {
    return (
      <div className="rounded-lg bg-gray-100 px-3 py-2 text-center">
        <p className="text-xs text-gray-500">Oferta finalizada</p>
      </div>
    );
  }

  const label = status === 'pending' ? 'Comienza en' : 'Termina en';
  const color = status === 'active' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700';

  return (
    <div className={`rounded-lg border px-3 py-2 ${color}`}>
      <p className="text-[10px] font-medium uppercase text-center mb-1">{label}</p>
      {timeLeft ? (
        <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold">
          {timeLeft.days > 0 && (
            <>
              <span>{pad(timeLeft.days)}<small className="text-[9px] font-normal ml-0.5">d</small></span>
              <span className="opacity-50">:</span>
            </>
          )}
          <span>{pad(timeLeft.hours)}<small className="text-[9px] font-normal ml-0.5">h</small></span>
          <span className="opacity-50">:</span>
          <span>{pad(timeLeft.minutes)}<small className="text-[9px] font-normal ml-0.5">m</small></span>
          <span className="opacity-50">:</span>
          <span>{pad(timeLeft.seconds)}<small className="text-[9px] font-normal ml-0.5">s</small></span>
        </div>
      ) : (
        <p className="text-center text-xs">Oferta activa</p>
      )}
    </div>
  );
}
