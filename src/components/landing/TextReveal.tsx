'use client';

import { useEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
  interval?: number;
  delay?: number;
  className?: string;
}

export default function TextReveal({ children, interval = 40000, delay = 300, className = '' }: Props) {
  const [active, setActive] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // First reveal on load
    const firstTimeout = setTimeout(() => {
      setActive(true);
      setHidden(false);
    }, delay);

    // After animation ends, reset state
    const resetFirst = setTimeout(() => {
      setActive(false);
    }, delay + 1000);

    // Repeat every interval
    const loop = setInterval(() => {
      setHidden(true);
      setActive(false);

      setTimeout(() => {
        setActive(true);
        setHidden(false);
      }, 100);

      setTimeout(() => {
        setActive(false);
      }, 1100);
    }, interval);

    return () => {
      clearTimeout(firstTimeout);
      clearTimeout(resetFirst);
      clearInterval(loop);
    };
  }, [interval, delay]);

  return (
    <span
      className={`${hidden && !active ? 'text-reveal-hidden' : ''} ${active ? 'text-reveal-active' : ''} ${className}`}
    >
      {children}
    </span>
  );
}
