'use client';

import { useEffect, useState, useCallback } from 'react';

interface Props {
  text: string;
  speed?: number;
  className?: string;
  delay?: number;
  repeatInterval?: number;
}

export default function TypingEffect({ text, speed = 30, className = '', delay = 500, repeatInterval = 20000 }: Props) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  const runTyping = useCallback(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return interval;
  }, [text, speed]);

  useEffect(() => {
    if (!started) return;

    let typingInterval = runTyping();

    const loop = setInterval(() => {
      clearInterval(typingInterval);
      typingInterval = runTyping();
    }, repeatInterval);

    return () => {
      clearInterval(typingInterval);
      clearInterval(loop);
    };
  }, [started, runTyping, repeatInterval]);

  return (
    <span className={className}>
      {displayed}
      <span className="animate-blink ml-0.5 inline-block w-[2px] h-[1em] bg-cyan-300 align-middle" />
    </span>
  );
}
