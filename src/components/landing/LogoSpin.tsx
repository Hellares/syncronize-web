'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  interval?: number;
}

export default function LogoSpin({ children, interval = 30000 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    // First spin on load, then remove
    const firstTimeout = setTimeout(() => setSpinning(false), 1500);

    // Repeat every interval
    const loop = setInterval(() => {
      setSpinning(true);
      setTimeout(() => setSpinning(false), 1500);
    }, interval);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(loop);
    };
  }, [interval]);

  return (
    <div
      ref={ref}
      className={`logo-spin-once ${spinning ? 'spinning' : ''}`}
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}
